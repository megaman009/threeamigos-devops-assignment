const request = require('supertest');
const { Client } = require('pg');
const redis = require('redis');

// Set test environment
process.env.NODE_ENV = 'test';

// Mock the database connections for testing
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(),
    query: jest.fn(),
    end: jest.fn().mockResolvedValue()
  }))
}));

jest.mock('redis', () => ({
  createClient: jest.fn().mockReturnValue({
    connect: jest.fn().mockResolvedValue(),
    get: jest.fn(),
    setEx: jest.fn().mockResolvedValue(),
    quit: jest.fn().mockResolvedValue()
  })
}));

// Import the app and clients after mocking
let { app, clients } = require('./index');

describe('Product Service API Tests', () => {
  beforeEach(() => {
    // Set up mock clients
    clients.db = {
      query: jest.fn(),
      end: jest.fn().mockResolvedValue()
    };
    clients.redis = {
      get: jest.fn(),
      setEx: jest.fn().mockResolvedValue(),
      connect: jest.fn().mockResolvedValue(),
      quit: jest.fn().mockResolvedValue()
    };

    // Mock fetch
    global.fetch = jest.fn();
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'Product Service is healthy'
      });
    });
  });

  describe('GET /products', () => {
    it('should return products from cache when available', async () => {
      const cachedProducts = [
        { id: 1, name: 'Coffee Beans', stock: 42, price: 12.99 }
      ];

      // Mock Redis returning cached data
      clients.redis.get.mockResolvedValue(JSON.stringify(cachedProducts));

      const response = await request(app)
        .get('/products')
        .expect(200);

      expect(response.body).toEqual(cachedProducts);
      expect(clients.redis.get).toHaveBeenCalledWith('products');
      expect(clients.db.query).not.toHaveBeenCalled(); // Should not query DB if cached
    });

    it('should return products from database when not cached', async () => {
      const dbProducts = [
        { id: 1, name: 'Coffee Beans', stock: 42, price: 12.99 },
        { id: 2, name: 'Espresso Machine', stock: 5, price: 299.99 }
      ];

      // Mock Redis returning null (not cached)
      clients.redis.get.mockResolvedValue(null);

      // Mock database query
      clients.db.query.mockResolvedValue({
        rows: dbProducts
      });

      const response = await request(app)
        .get('/products')
        .expect(200);

      expect(response.body).toEqual(dbProducts);
      expect(clients.redis.get).toHaveBeenCalledWith('products');
      expect(clients.db.query).toHaveBeenCalledWith('SELECT id, name, stock, price FROM products ORDER BY id');
      expect(clients.redis.setEx).toHaveBeenCalledWith('products', 300, JSON.stringify(dbProducts));
    });

    it('should handle database errors', async () => {
      // Mock Redis returning null and database error
      clients.redis.get.mockResolvedValue(null);
      clients.db.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/products')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to fetch products'
      });
    });
  });

  describe('GET /product-with-user', () => {
    it('should return product with user data', async () => {
      const mockUser = { id: 101, name: 'Test User', role: 'customer' };
      const mockProduct = { id: 1, name: 'Coffee Beans', stock: 42, price: 12.99 };

      // Mock database query for products
      clients.db.query.mockResolvedValue({
        rows: [mockProduct]
      });

      // Mock fetch for user service
      global.fetch.mockResolvedValue({
        ok: true,
        json: jest.fn(() => Promise.resolve(mockUser))
      });

      const response = await request(app)
        .get('/product-with-user')
        .expect(200);

      expect(response.body).toEqual({
        product: mockProduct,
        user: mockUser
      });
    });

    it('should handle user service errors with resilience fallback', async () => {
      // Mock database query
      clients.db.query.mockResolvedValue({
        rows: [{ id: 1, name: 'Coffee Beans', stock: 42, price: 12.99 }]
      });

      // Mock fetch failure
      global.fetch.mockRejectedValue(new Error('User service unavailable'));

      const response = await request(app)
        .get('/product-with-user')
        .expect(200);

      // Should return product with resilience fallback user
      expect(response.body.product).toEqual({
        id: 1,
        name: 'Coffee Beans',
        stock: 42,
        price: 12.99
      });
      
      expect(response.body.user).toEqual({
        id: null,
        name: "Unavailable (Resilience Fallback)",
        role: "guest",
        message: "User Service could not be reached or access was denied."
      });
    });
  });
});