const express = require('express');
const app = express();
const PORT = 3001;

const SERVICE_NAME = 'user-service';

app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${SERVICE_NAME}] ${req.method} ${req.path}`);
  next();
});


const { auth, requiredScopes } = require('express-oauth2-jwt-bearer');

// Auth0 Configuration
const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE || 'https://thamco-user-api',
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL || 'https://dev-placeholder.auth0.com/',
  tokenSigningAlg: 'RS256'
});

// Middleware to parse user info from JWT (mock for now or extract from sub)
const getUserInfo = (req, res, next) => {
  // In a real app, we might query the DB using req.auth.payload.sub
  req.user = {
    auth0Id: req.auth.payload.sub,
    roles: req.auth.payload['https://thamco/roles'] || ['customer']
  };
  next();
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
  const anonymised = {
    id,
    name: 'deleted',
    email: 'deleted@redacted',
    phone: null,
    status: 'anonymised'
  };
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

