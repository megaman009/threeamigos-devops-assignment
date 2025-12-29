const request = require('supertest');

// Mock express-oauth2-jwt-bearer before requiring the app
jest.mock('express-oauth2-jwt-bearer', () => ({
  auth: jest.fn(() => (req, res, next) => {
    // Simulate successful JWT validation
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer valid-token')) {
      req.auth = {
        payload: {
          sub: 'auth0|123456789',
          'https://thamco/roles': ['customer']
        }
      };
      next();
    } else if (req.headers.authorization) {
      // Invalid token
      res.status(401).json({ error: 'Invalid token' });
    } else {
      // No token provided
      res.status(401).json({ error: 'No authorization token was found' });
    }
  }),
  requiredScopes: jest.fn(() => (req, res, next) => next())
}));

// Now require the app after mocking
const app = require('./index');

describe('User Service API Tests', () => {
  beforeEach(() => {
    delete process.env.AUTH0_DOMAIN;
    delete process.env.AUTH0_MGMT_CLIENT_ID;
    delete process.env.AUTH0_MGMT_CLIENT_SECRET;
    if (global.fetch && global.fetch.mockRestore) {
      global.fetch.mockRestore();
    }
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'User Service is healthy'
      });
    });
  });

  describe('GET /user', () => {
    it('should return user data with valid JWT', async () => {
      const response = await request(app)
        .get('/user')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        id: 101,
        auth0Id: 'auth0|123456789',
        name: 'Authorized User',
        email: 'user@example.com',
        role: 'customer',
        message: 'This data is protected by Auth0'
      });
    });

    it('should return 401 without authorization header', async () => {
      const response = await request(app)
        .get('/user')
        .expect(401);

      expect(response.body).toEqual({
        error: 'No authorization token was found'
      });
    });

    it('should return 401 with invalid JWT', async () => {
      const response = await request(app)
        .get('/user')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Invalid token'
      });
    });

    it('should extract roles from JWT payload', async () => {
      const response = await request(app)
        .get('/user')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.role).toBe('customer');
    });
  });

  describe('GET /funds', () => {
    it('should return default funds for a user', async () => {
      process.env.DEFAULT_FUNDS = '150';
      const response = await request(app)
        .get('/funds?userId=101')
        .expect(200);
      expect(response.body).toEqual({ userId: '101', funds: 150 });
    });
  });

  describe('POST /users/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/users/register')
        .send({ email: 'newuser@example.com', password: 'securepass123', name: 'New User' })
        .expect(201);
      expect(response.body).toMatchObject({
        email: 'newuser@example.com',
        name: 'New User',
        role: 'customer'
      });
      expect(response.body.id).toBeDefined();
    });

    it('should reject registration without email', async () => {
      const response = await request(app)
        .post('/users/register')
        .send({ password: 'securepass123' })
        .expect(400);
      expect(response.body).toEqual({ error: 'Email and password required' });
    });
  });

  describe('PATCH /users/:id', () => {
    it('should update user profile when authorized', async () => {
      const response = await request(app)
        .patch('/users/101')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Updated Name', email: 'updated@example.com' })
        .expect(200);
      expect(response.body).toMatchObject({
        id: '101',
        name: 'Updated Name',
        email: 'updated@example.com'
      });
    });

    it('should reject when not authorized', async () => {
      const response = await request(app)
        .patch('/users/101')
        .send({ name: 'Hacker' })
        .expect(401);
      expect(response.body).toEqual({ error: 'No authorization token was found' });
    });
  });

  describe('DELETE /users/:id', () => {
    it('should anonymise user when authorized', async () => {
      const response = await request(app)
        .delete('/users/101')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      expect(response.body).toMatchObject({ message: 'Account anonymised (stub)', user: { id: '101', status: 'anonymised' } });
    });

    it('should reject when not authorized', async () => {
      const response = await request(app)
        .delete('/users/101')
        .expect(401);
      expect(response.body).toEqual({ error: 'No authorization token was found' });
    });
  });

  describe('DELETE /me', () => {
    it('should return 501 if Auth0 Management API is not configured', async () => {
      const response = await request(app)
        .delete('/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(501);

      expect(response.body).toEqual({
        error: 'Auth0 Management API is not configured on this service'
      });
    });

    it('should delete Auth0 user and anonymise when configured', async () => {
      process.env.AUTH0_DOMAIN = 'dev-example.us.auth0.com';
      process.env.AUTH0_MGMT_CLIENT_ID = 'client-id';
      process.env.AUTH0_MGMT_CLIENT_SECRET = 'client-secret';

      global.fetch = jest
        .fn()
        // 1) oauth/token
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'mgmt-token', expires_in: 3600 })
        })
        // 2) delete user
        .mockResolvedValueOnce({
          ok: true,
          status: 204,
          text: async () => ''
        });

      const response = await request(app)
        .delete('/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Account deleted from Auth0 and anonymised (stub)',
        auth0: { deleted: true },
        user: { id: 101, auth0Id: 'auth0|123456789', status: 'anonymised' }
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch.mock.calls[0][0]).toBe('https://dev-example.us.auth0.com/oauth/token');
      expect(global.fetch.mock.calls[1][0]).toBe('https://dev-example.us.auth0.com/api/v2/users/auth0%7C123456789');
    });
  });
});
