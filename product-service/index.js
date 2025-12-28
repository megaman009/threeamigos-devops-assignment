const SERVICE_NAME = 'product-service';

const express = require('express');
const { Client } = require('pg');
const redis = require('redis');

const app = express();
app.use(express.json());

// Global database clients
let clients = { db: null, redis: null };

// Connect to databases (only in production, not in tests)
async function connectDatabases() {
  try {
    // Create new clients each time to avoid reuse issues
    const { Client } = require('pg');
    const redis = require('redis');
    
    const db = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    
    const redisCli = redis.createClient({
      url: process.env.REDIS_URL,
    });

    // Connect to databases
    await db.connect();
    console.log(`[${SERVICE_NAME}] Connected to PostgreSQL`);

    await redisCli.connect();
    console.log(`[${SERVICE_NAME}] Connected to Redis`);

    // Store references globally for use in routes
    clients.db = db;
    clients.redis = redisCli;

    // Create products table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log(`[${SERVICE_NAME}] Products table ready`);

    // Insert sample data if table is empty
    const result = await db.query('SELECT COUNT(*) FROM products');
    if (parseInt(result.rows[0].count) === 0) {
      await db.query(`
        INSERT INTO products (name, stock, price) VALUES
        ('Coffee Beans', 42, 12.99),
        ('Espresso Machine', 5, 299.99)
      `);
      console.log(`[${SERVICE_NAME}] Sample products inserted`);
    }

  } catch (error) {
    console.error(`[${SERVICE_NAME}] Database connection failed:`, error);
    // Don't exit in test environment
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
}

// Initialize databases (only in non-test environments)
if (process.env.NODE_ENV !== 'test') {
  connectDatabases();
}

// Health check
app.get('/health', (req, res) => {
  console.log(`[${SERVICE_NAME}] health check requested`);
  res.status(200).json({ status: 'Product Service is healthy' });
});


// Sample product endpoint
app.get('/products', async (req, res) => {
  try {
    // Try to get from Redis cache first
    const cachedProducts = await clients.redis.get('products');
    if (cachedProducts) {
      console.log(`[${SERVICE_NAME}] Returning products from cache`);
      return res.json(JSON.parse(cachedProducts));
    }

    // If not in cache, query database
    console.log(`[${SERVICE_NAME}] Fetching products from database`);
    const result = await clients.db.query('SELECT id, name, stock, price FROM products ORDER BY id');
    
    const products = result.rows;
    
    // Cache the result for 5 minutes (300 seconds)
    await clients.redis.setEx('products', 300, JSON.stringify(products));
    
    res.json(products);
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error fetching products:`, error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// NEW: service-to-service call
// Mock Supplier API (demonstrates faking external dependencies)
const mockSupplierAPI = () => {
  return {
    getProducts: async () => {
      // Simulates supplier response with delay
      await new Promise(resolve => setTimeout(resolve, 100));
      return [
        { sku: 'SUP-001', name: 'Coffee Beans', price: 10.99, stock: 50 },
        { sku: 'SUP-002', name: 'Espresso Machine', price: 249.99, stock: 10 }
      ];
    }
  };
};

// Supplier sync endpoint (demonstrates daily sync requirement)
app.get('/sync-supplier', async (req, res) => {
  console.log(`[${SERVICE_NAME}] /sync-supplier requested`);
  
  try {
    const supplier = mockSupplierAPI();
    const supplierProducts = await supplier.getProducts();
    
    console.log(`[${SERVICE_NAME}] Fetched ${supplierProducts.length} products from supplier (mock)`);
    
    // In production, this would update DB with supplier data + 10% markup
    res.json({
      status: 'success',
      productsReceived: supplierProducts.length,
      message: 'Supplier sync complete (mock)',
      products: supplierProducts
    });
    
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Supplier sync failed:`, error.message);
    res.status(500).json({ error: 'Supplier sync failed' });
  }
});

app.get('/product-with-user', async (req, res) => {
  console.log(`[${SERVICE_NAME}] /product-with-user requested`);

  try {
    // Get product from database
    const result = await clients.db.query('SELECT id, name, stock, price FROM products WHERE id = 1');
    const products = result.rows;
    const product = products[0];

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let user = null;
    try {
      console.log(`[${SERVICE_NAME}] calling user-service at ${process.env.USER_SERVICE_URL}`);
      const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
      
      // Attempt to fetch user with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      const response = await fetch(`${USER_SERVICE_URL}/user`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`User service returned ${response.status}`);
      }
      
      user = await response.json();
      console.log(`[${SERVICE_NAME}] user-service responded successfully`);
      
    } catch (serviceError) {
      console.warn(`[${SERVICE_NAME}] User Service call failed (Graceful Fallback): ${serviceError.message}`);
      // RESILIENCE: Graceful degradation when user-service unavailable
      user = { 
        id: null, 
        name: "Unavailable (Resilience Fallback)", 
        role: "guest",
        message: "User Service could not be reached or access was denied."
      };
    }

    res.json({
      product,
      user
    });

  } catch (error) {
    // This catch block handles DB errors or critical failures
    console.error(`[${SERVICE_NAME}] Critical error:`, error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// START SERVER LAST (only if this file is run directly)
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  // Initialize databases and start server only when run directly (not in tests)
  connectDatabases().then(() => {
    const server = app.listen(PORT, () => {
      console.log(`[${SERVICE_NAME}] running on port ${PORT}`);
    });

    process.on('SIGTERM', async () => {
      console.log(`[${SERVICE_NAME}] shutting down...`);
      
      // Close database connections
      try {
        if (clients.db) await clients.db.end();
        if (clients.redis) await clients.redis.quit();
        console.log(`[${SERVICE_NAME}] Database connections closed`);
      } catch (error) {
        console.error(`[${SERVICE_NAME}] Error closing connections:`, error);
      }
      
      server.close(() => {
        console.log(`[${SERVICE_NAME}] closed`);
        process.exit(0);
      });
    });
  }).catch((error) => {
    console.error(`[${SERVICE_NAME}] Failed to start:`, error);
    process.exit(1);
  });
}

// Export app for testing
module.exports = { app, clients };
