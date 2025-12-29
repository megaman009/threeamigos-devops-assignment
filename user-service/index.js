const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 3001;

const SERVICE_NAME = 'user-service';

// Security Middleware
app.use(helmet());
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3002';
app.use(cors(
  corsOrigin === '*'
    ? { origin: '*', credentials: false }
    : { origin: corsOrigin, credentials: true }
));
app.use(express.json());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.'
});
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => (req.path === '/health' ? next() : limiter(req, res, next)));
}

app.use((req, res, next) => {
  console.log(`[${SERVICE_NAME}] ${req.method} ${req.path}`);
  next();
});


const { auth, requiredScopes } = require('express-oauth2-jwt-bearer');

// Auth0 Configuration
const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE || 'https://thamco-user-api',
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL || 'https://dev-0dkhahbfgadu44x6.us.auth0.com/',
  tokenSigningAlg: 'RS256'
});

const getAuth0Domain = () => {
  if (process.env.AUTH0_DOMAIN) return process.env.AUTH0_DOMAIN;

  const issuer = process.env.AUTH0_ISSUER_BASE_URL;
  if (!issuer) return null;
  try {
    const url = new URL(issuer);
    return url.host;
  } catch {
    return null;
  }
};

const getAuth0MgmtConfig = () => {
  return {
    domain: getAuth0Domain(),
    clientId: process.env.AUTH0_MGMT_CLIENT_ID || null,
    clientSecret: process.env.AUTH0_MGMT_CLIENT_SECRET || null
  };
};

let auth0MgmtTokenCache = null;
const getAuth0MgmtToken = async () => {
  const { domain, clientId, clientSecret } = getAuth0MgmtConfig();
  if (!domain || !clientId || !clientSecret) {
    const err = new Error('Auth0 Management API not configured');
    err.code = 'AUTH0_MGMT_NOT_CONFIGURED';
    throw err;
  }

  const now = Date.now();
  if (auth0MgmtTokenCache && auth0MgmtTokenCache.expiresAtMs > now + 30_000) {
    return auth0MgmtTokenCache.accessToken;
  }

  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is not available in this Node runtime');
  }

  const tokenResp = await fetch(`https://${domain}/oauth/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      audience: `https://${domain}/api/v2/`
    })
  });

  if (!tokenResp.ok) {
    const text = await tokenResp.text().catch(() => '');
    throw new Error(`Failed to obtain Auth0 management token (${tokenResp.status}): ${text || tokenResp.statusText}`);
  }

  const data = await tokenResp.json();
  const accessToken = data?.access_token;
  const expiresInSec = Number(data?.expires_in || 0);

  if (!accessToken || !expiresInSec) {
    throw new Error('Auth0 token response missing access_token/expires_in');
  }

  auth0MgmtTokenCache = {
    accessToken,
    expiresAtMs: now + expiresInSec * 1000
  };

  return accessToken;
};

const deleteAuth0User = async (auth0UserId) => {
  const { domain } = getAuth0MgmtConfig();
  const mgmtToken = await getAuth0MgmtToken();

  const resp = await fetch(`https://${domain}/api/v2/users/${encodeURIComponent(auth0UserId)}`, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${mgmtToken}`
    }
  });

  if (resp.status === 204) {
    return { deleted: true };
  }

  if (resp.status === 404) {
    return { deleted: false, notFound: true };
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Auth0 delete user failed (${resp.status}): ${text || resp.statusText}`);
  }

  return { deleted: true };
};

// Middleware to parse user info from JWT (mock for now or extract from sub)
const getUserInfo = (req, res, next) => {
  // In a real app, we might query the DB using req.auth.payload.sub
  req.user = {
    auth0Id: req.auth.payload.sub,
    roles: req.auth.payload['https://thamco/roles'] || ['customer']
  };
  next();
};

const anonymiseUser = ({ id, auth0Id }) => {
  return {
    id,
    auth0Id: auth0Id || null,
    name: 'deleted',
    email: 'deleted@redacted',
    phone: null,
    status: 'anonymised'
  };
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'User Service is healthy' });
});

// PROTECTED User endpoint
app.get('/user', checkJwt, getUserInfo, (req, res) => {
  // Mock DB lookup based on the token's subject (sub)
  res.json({
    id: 101,
    auth0Id: req.user.auth0Id,
    name: 'Authorized User',
    email: 'user@example.com',
    role: req.user.roles[0] || 'customer',
    message: 'This data is protected by Auth0'
  });
});

// Delete the currently authenticated user:
// - Deletes the Auth0 user via the Management API
// - Also anonymises local data (stub)
app.delete('/me', checkJwt, getUserInfo, async (req, res) => {
  try {
    const auth0Id = req.user?.auth0Id;
    if (!auth0Id) {
      return res.status(400).json({ error: 'Missing user identity (sub)' });
    }

    const auth0Delete = await deleteAuth0User(auth0Id);

    const anonymised = anonymiseUser({
      id: 101,
      auth0Id
    });

    console.log(`[${SERVICE_NAME}] User deleted from Auth0 and anonymised:`, auth0Id);
    return res.json({
      message: 'Account deleted from Auth0 and anonymised (stub)',
      auth0: auth0Delete,
      user: anonymised
    });
  } catch (err) {
    if (err?.code === 'AUTH0_MGMT_NOT_CONFIGURED') {
      return res.status(501).json({ error: 'Auth0 Management API is not configured on this service' });
    }
    console.error(`[${SERVICE_NAME}] Failed to delete /me:`, err);
    return res.status(502).json({ error: 'Failed to delete account' });
  }
});

// Public funds endpoint (mock) for inter-service checks
app.get('/funds', (req, res) => {
  const userId = req.query.userId || 'unknown';
  const defaultFunds = Number(process.env.DEFAULT_FUNDS || 100);
  res.json({ userId, funds: defaultFunds });
});

// User registration (public endpoint)
app.post('/users/register', (req, res) => {
  const { email, password, name } = req.body || {};
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  // In production: hash password, save to DB, create Auth0 account
  const newUser = {
    id: Math.floor(Math.random() * 100000) + 1000,
    email,
    name: name || 'New User',
    role: 'customer',
    createdAt: new Date().toISOString(),
    message: 'Registration successful (stub - Auth0 integration needed for production)'
  };
  
  console.log(`[${SERVICE_NAME}] User registered:`, newUser.email);
  res.status(201).json(newUser);
});

// User profile update (protected endpoint)
app.patch('/users/:id', checkJwt, (req, res) => {
  const id = req.params.id;
  const { name, email, phone } = req.body || {};
  
  // In production: validate and update DB
  const updated = {
    id,
    name: name || 'Updated User',
    email: email || 'updated@example.com',
    phone: phone || null,
    updatedAt: new Date().toISOString(),
    message: 'Profile updated successfully (stub)'
  };
  
  console.log(`[${SERVICE_NAME}] User profile updated:`, id);
  res.json(updated);
});

// Account deletion (stub) – anonymise personal data
app.delete('/users/:id', checkJwt, (req, res) => {
  const id = req.params.id;
  const anonymised = anonymiseUser({ id, auth0Id: null });
  console.log(`[${SERVICE_NAME}] User account anonymised:`, id);
  res.json({ message: 'Account anonymised (stub)', user: anonymised });
});

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`User Service running on port ${PORT}`);
  });

  process.on('SIGTERM', () => {
    console.log('User Service shutting down...');
    server.close(() => {
      console.log('User Service closed');
      process.exit(0);
    });
  });
}

// Export app for testing
module.exports = app;

