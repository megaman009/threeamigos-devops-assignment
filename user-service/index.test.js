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
});
