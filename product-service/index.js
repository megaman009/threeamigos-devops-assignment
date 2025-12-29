const SERVICE_NAME = 'product-service';

const express = require('express');
const redis = require('redis');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Security Middleware
app.use(helmet()); // Adds security headers

// Enable CORS for frontend
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3002';
app.use(cors(
  corsOrigin === '*'
    ? { origin: '*', credentials: false }
    : { origin: corsOrigin, credentials: true }
));
app.use(express.json());

// Rate Limiting (prevent abuse)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Avoid creating long-lived timers in unit tests (express-rate-limit uses an internal interval)
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => (req.path === '/health' ? next() : limiter(req, res, next)));
}

// Global database clients
let clients = { db: null, redis: null };

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const dbName = process.env.DB_NAME || 'postgres';
  const port = process.env.DB_PORT || '5432';
  if (!host || !user || !password) return undefined;

  const needsSsl =
    process.env.NODE_ENV === 'production' || /\.postgres\.database\.azure\.com$/i.test(host);

  const query = needsSsl ? '?sslmode=require' : '';
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}${query}`;
}

function resolveRedisUrl() {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;

  const host = process.env.REDIS_HOST;
  const port = process.env.REDIS_PORT || '6379';
  if (!host) return undefined;

  const password = process.env.REDIS_PASSWORD;
  const useTls =
    process.env.REDIS_TLS === 'true' || port === '6380' || process.env.NODE_ENV === 'production';
  const scheme = useTls ? 'rediss' : 'redis';
  const auth = password ? `:${encodeURIComponent(password)}@` : '';
  return `${scheme}://${auth}${host}:${port}`;
}

function resolveUserServiceUrl() {
  const raw = process.env.USER_SERVICE_URL || 'http://localhost:3001';
  return raw.replace(/\/+$/, '');
}

async function ensureOrdersSchema(db) {
  const exists = await db.query("SELECT to_regclass('public.orders') AS reg");
  if (!exists.rows[0]?.reg) return;

  // If the table was created by an older version of the assignment, it may contain
  // required columns that our current INSERTs don't populate (e.g. user_email/total/items).
  // Make them safe by applying defaults so new inserts succeed.
  try {
    await db.query("ALTER TABLE public.orders ALTER COLUMN user_email SET DEFAULT ''");
  } catch (e) {
    // column may not exist / privileges / already compatible
  }
  try {
    await db.query('ALTER TABLE public.orders ALTER COLUMN total SET DEFAULT 0');
  } catch (e) {
    // ignore
  }
  try {
    await db.query("ALTER TABLE public.orders ALTER COLUMN items SET DEFAULT '[]'::jsonb");
  } catch (e) {
    // ignore
  }

  // Backfill if legacy columns exist but may contain NULLs
  try {
    await db.query("UPDATE public.orders SET user_email = '' WHERE user_email IS NULL");
  } catch (e) {
    // ignore
  }
  try {
    await db.query('UPDATE public.orders SET total = 0 WHERE total IS NULL');
  } catch (e) {
    // ignore
  }
  try {
    await db.query("UPDATE public.orders SET items = '[]'::jsonb WHERE items IS NULL");
  } catch (e) {
    // ignore
  }

  // Rename common legacy columns (safe + idempotent)
  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='orders' AND column_name='userid'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='orders' AND column_name='user_id'
      ) THEN
        ALTER TABLE public.orders RENAME COLUMN userid TO user_id;
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='orders' AND column_name='productid'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='orders' AND column_name='product_id'
      ) THEN
        ALTER TABLE public.orders RENAME COLUMN productid TO product_id;
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='orders' AND column_name='createdat'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='orders' AND column_name='created_at'
      ) THEN
        ALTER TABLE public.orders RENAME COLUMN createdat TO created_at;
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='orders' AND column_name='dispatchedat'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='orders' AND column_name='dispatched_at'
      ) THEN
        ALTER TABLE public.orders RENAME COLUMN dispatchedat TO dispatched_at;
      END IF;
    END $$;
  `);

  // Add missing columns (safe if they already exist)
  await db.query('ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id INTEGER');
  await db.query('ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_id INTEGER');
  await db.query('ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS quantity INTEGER');
  await db.query('ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2)');
  await db.query('ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status VARCHAR(32)');
  await db.query('ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP');
  await db.query('ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMP NULL');

  // Backfill common defaults
  await db.query('UPDATE public.orders SET user_id = 0 WHERE user_id IS NULL');
  await db.query("UPDATE public.orders SET status = 'created' WHERE status IS NULL");
  await db.query('UPDATE public.orders SET created_at = NOW() WHERE created_at IS NULL');

  // Best-effort: set defaults / constraints
  try {
    await db.query('ALTER TABLE public.orders ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP');
  } catch (e) {
    console.warn(`[${SERVICE_NAME}] orders.created_at default not enforced: ${e.message}`);
  }

  try {
    await db.query("ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'created'");
  } catch (e) {
    console.warn(`[${SERVICE_NAME}] orders.status default not enforced: ${e.message}`);
  }

  try {
    await db.query('ALTER TABLE public.orders ALTER COLUMN user_id SET NOT NULL');
  } catch (e) {
    console.warn(`[${SERVICE_NAME}] orders.user_id NOT NULL not enforced: ${e.message}`);
  }

  // Best-effort: add FK if possible
  try {
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'orders_product_id_fkey'
        ) THEN
          ALTER TABLE public.orders
            ADD CONSTRAINT orders_product_id_fkey
            FOREIGN KEY (product_id)
            REFERENCES public.products(id);
        END IF;
      END $$;
    `);
  } catch (e) {
    console.warn(`[${SERVICE_NAME}] orders.product_id FK not enforced: ${e.message}`);
  }
}

// Connect to databases (only in production, not in tests)
async function connectDatabases() {
  // PostgreSQL is required; Redis is optional (cache only).
  // This keeps Azure deployments working even when Redis isn't provisioned.
  const { Pool } = require('pg');

  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    console.error(`[${SERVICE_NAME}] Missing DATABASE_URL (or DB_HOST/DB_USER/DB_PASSWORD)`);
    if (process.env.NODE_ENV !== 'test') process.exit(1);
    return;
  }

  const db = new Pool({
    connectionString: databaseUrl,
    max: Number(process.env.PG_POOL_MAX || 10),
    idleTimeoutMillis: 30_000,
  });

  try {
    await db.query('SELECT 1');
    console.log(`[${SERVICE_NAME}] Connected to PostgreSQL`);
    clients.db = db;
  } catch (error) {
    console.error(`[${SERVICE_NAME}] PostgreSQL connection failed:`, error);
    if (process.env.NODE_ENV !== 'test') process.exit(1);
    return;
  }

  const redisUrl = resolveRedisUrl();
  if (!redisUrl) {
    console.warn(`[${SERVICE_NAME}] Redis not configured; caching disabled.`);
    clients.redis = null;
  } else {
    const redisCli = redis.createClient({ url: redisUrl });
    try {
      await redisCli.connect();
      console.log(`[${SERVICE_NAME}] Connected to Redis`);
      clients.redis = redisCli;
    } catch (error) {
      console.warn(`[${SERVICE_NAME}] Redis connection failed; caching disabled: ${error.message}`);
      try {
        await redisCli.quit();
      } catch (e) {
        // ignore
      }
      clients.redis = null;
    }
  }

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

  // Create orders table if it doesn't exist
  await db.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        total_price DECIMAL(10,2) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'created',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        dispatched_at TIMESTAMP NULL
      )
    `);
  console.log(`[${SERVICE_NAME}] Orders table ready`);

  // If the table existed from a previous run with a different schema, fix it.
  await ensureOrdersSchema(db);

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
}

// Note: we connect + start the server in the `require.main === module` block below.

// Health check
app.get('/health', (req, res) => {
  console.log(`[${SERVICE_NAME}] health check requested`);
  res.status(200).json({ status: 'Product Service is healthy' });
});


// Sample product endpoint
app.get('/products', async (req, res) => {
  try {
    // Try to get from Redis cache first
    if (clients.redis) {
      try {
        const cachedProducts = await clients.redis.get('products');
        if (cachedProducts) {
          console.log(`[${SERVICE_NAME}] Returning products from cache`);
          return res.json(JSON.parse(cachedProducts));
        }
      } catch (e) {
        console.warn(`[${SERVICE_NAME}] Redis cache read failed, falling back to DB: ${e.message}`);
      }
    }

    // If not in cache, query database
    console.log(`[${SERVICE_NAME}] Fetching products from database`);
    // Protect the UI from duplicate seed data: return one row per product name (lowest id wins).
    // Keeps ordering stable by the chosen id.
    const result = await clients.db.query(`
      SELECT p.id, p.name, p.stock, p.price
      FROM products p
      JOIN (
        SELECT MIN(id) AS id
        FROM products
        GROUP BY name
      ) pick USING (id)
      ORDER BY p.id
    `);
    
    const products = result.rows;
    
    // Cache the result for 5 minutes (300 seconds)
    if (clients.redis) {
      try {
        await clients.redis.setEx('products', 300, JSON.stringify(products));
      } catch (e) {
        console.warn(`[${SERVICE_NAME}] Redis cache write failed: ${e.message}`);
      }
    }
    
    res.json(products);
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error fetching products:`, error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Product search (loose search within name)
app.get('/products/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.status(400).json({ error: 'Missing q parameter' });
    }

    // Same de-duplication strategy as /products (unique by name, lowest id wins)
    const result = await clients.db.query(
      `
        SELECT p.id, p.name, p.stock, p.price
        FROM products p
        JOIN (
          SELECT MIN(id) AS id
          FROM products
          WHERE name ILIKE $1
          GROUP BY name
        ) pick USING (id)
        ORDER BY p.id
      `,
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error searching products:`, error);
    res.status(500).json({ error: 'Failed to search products' });
  }
});

// NEW: service-to-service call
// Mock Supplier API (demonstrates faking external dependencies)
// Simulates multiple suppliers with different prices for deduplication
const mockSupplierAPI = () => {
  return {
    getProducts: async () => {
      // Simulates supplier response with delay
      await new Promise(resolve => setTimeout(resolve, 100));
      return [
        // Supplier A
        { supplier: 'SupplierA', sku: 'SUP-A-001', name: 'Coffee Beans', price: 10.99, stock: 50 },
        { supplier: 'SupplierA', sku: 'SUP-A-002', name: 'Espresso Machine', price: 249.99, stock: 10 },
        // Supplier B (cheaper coffee, more expensive machine)
        { supplier: 'SupplierB', sku: 'SUP-B-001', name: 'Coffee Beans', price: 9.50, stock: 30 },
        { supplier: 'SupplierB', sku: 'SUP-B-002', name: 'Espresso Machine', price: 279.99, stock: 5 },
        // Supplier C (cheapest machine, expensive coffee)
        { supplier: 'SupplierC', sku: 'SUP-C-001', name: 'Coffee Beans', price: 11.99, stock: 100 },
        { supplier: 'SupplierC', sku: 'SUP-C-002', name: 'Espresso Machine', price: 239.99, stock: 8 }
      ];
    }
  };
};

// Deduplicates supplier products and selects cheapest price for each product
function deduplicateAndSelectCheapest(supplierProducts) {
  const productMap = new Map();
  
  for (const sp of supplierProducts) {
    const existing = productMap.get(sp.name);
    if (!existing || sp.price < existing.price) {
      productMap.set(sp.name, sp);
    }
  }
  
  return Array.from(productMap.values());
}

// Email notification logger (demonstrates email requirement from brief)
function sendEmailNotification(type, data) {
  const timestamp = new Date().toISOString();
  const emailLog = {
    timestamp,
    type, // 'order_created', 'order_dispatched', etc.
    to: data.email || 'customer@example.com',
    subject: data.subject || 'ThAmCo Notification',
    body: data.body || '',
    metadata: data.metadata || {}
  };
  
  // Log to console (in production, this would send via SendGrid/AWS SES/etc)
  console.log(`[${SERVICE_NAME}] EMAIL SENT:`, JSON.stringify(emailLog));
  
  // In production, append to email audit log file or send to email service
  return emailLog;
}

// Update stock and price from supplier (cheapest +10%)
async function updateStockFromSupplier() {
  try {
    const supplier = mockSupplierAPI();
    const allSupplierProducts = await supplier.getProducts();
    
    console.log(`[${SERVICE_NAME}] Fetched ${allSupplierProducts.length} products from ${new Set(allSupplierProducts.map(p => p.supplier)).size} suppliers`);
    
    // DEDUPLICATION: Select cheapest price for each product
    const dedupedProducts = deduplicateAndSelectCheapest(allSupplierProducts);
    console.log(`[${SERVICE_NAME}] After deduplication: ${dedupedProducts.length} unique products`);

    // Apply +10% markup and update DB
    for (const sp of dedupedProducts) {
      const priceWithMarkup = (sp.price * 1.10).toFixed(2);
      console.log(`[${SERVICE_NAME}] Updating ${sp.name}: cheapest=${sp.price} from ${sp.supplier}, our price=${priceWithMarkup}`);
      
      await clients.db.query(
        `UPDATE products SET stock = $1, price = $2 WHERE name = $3`,
        [sp.stock, priceWithMarkup, sp.name]
      );
    }

    // Invalidate cache after update
    await clients.redis.del('products');
    console.log(`[${SERVICE_NAME}] Stock/prices updated from supplier and cache invalidated`);
  } catch (err) {
    console.warn(`[${SERVICE_NAME}] updateStockFromSupplier failed: ${err.message}`);
  }
}

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

// Basic ordering APIs
app.post('/orders', async (req, res) => {
  let tx = null;
  let q = null;
  const rollbackAndRelease = async () => {
    if (!tx) return;
    try {
      if (typeof q === 'function') await q('ROLLBACK');
    } catch (_) {
      // ignore
    }
    try {
      if (typeof tx.release === 'function') tx.release();
    } catch (_) {
      // ignore
    }
    tx = null;
  };

  try {
    const { userId, productId, quantity } = req.body || {};
    if (!userId || !productId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Missing or invalid fields: userId, productId, quantity' });
    }

    const db = clients.db;
    if (!db) return res.status(503).json({ error: 'Database not ready' });

    // If we have a Pool, use a transaction to avoid partial updates.
    tx = typeof db.connect === 'function' ? await db.connect() : null;
    q = tx ? tx.query.bind(tx) : db.query.bind(db);

    if (tx) await q('BEGIN');

    const productRes = await q('SELECT id, name, stock, price FROM products WHERE id = $1 FOR UPDATE', [productId]);
    const product = productRes.rows[0];
    if (!product) {
      await rollbackAndRelease();
      return res.status(404).json({ error: 'Product not found' });
    }
    if (product.stock < quantity) {
      await rollbackAndRelease();
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Check user funds via user-service (mocked public endpoint)
    const USER_SERVICE_URL = resolveUserServiceUrl();
    let funds = 0;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      let resp;
      try {
        resp = await fetch(`${USER_SERVICE_URL}/funds?userId=${encodeURIComponent(userId)}`, { signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
      if (resp.ok) {
        const data = await resp.json();
        funds = Number(data.funds || 0);
      } else {
        console.warn(`[${SERVICE_NAME}] funds endpoint returned ${resp.status}, assuming 0`);
      }
    } catch (e) {
      console.warn(`[${SERVICE_NAME}] funds check failed: ${e.message}`);
    }

    const totalPrice = Number((Number(product.price) * quantity).toFixed(2));
    if (funds < totalPrice) {
      await rollbackAndRelease();
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Simulate supplier purchase
    try {
      const supplier = mockSupplierAPI();
      const supplierProducts = await supplier.getProducts();
      const supplierProduct = supplierProducts.find(sp => sp.name === product.name);
      if (!supplierProduct || supplierProduct.stock < quantity) {
        await rollbackAndRelease();
        return res.status(400).json({ error: 'Supplier out of stock' });
      }
    } catch (e) {
      await rollbackAndRelease();
      return res.status(502).json({ error: 'Supplier purchase failed' });
    }

    // Deduct stock and create order
    await q('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantity, productId]);

    const orderEmail = `user${userId}@example.com`;
    const orderItems = [
      { productId: Number(productId), name: product.name, quantity: Number(quantity), unitPrice: Number(product.price) }
    ];

    let orderRes;
    try {
      // Legacy-compatible insert (older schema requires user_email/total/items)
      orderRes = await q(
        'INSERT INTO orders (user_id, product_id, quantity, total_price, status, user_email, total, items) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [userId, productId, quantity, totalPrice, 'created', orderEmail, totalPrice, JSON.stringify(orderItems)]
      );
    } catch (e) {
      // If legacy columns don't exist, fall back to the current schema insert.
      if (e && (e.code === '42703' || /column .* does not exist/i.test(String(e.message)))) {
        orderRes = await q(
          'INSERT INTO orders (user_id, product_id, quantity, total_price, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [userId, productId, quantity, totalPrice, 'created']
        );
      } else {
        throw e;
      }
    }

    if (tx) await q('COMMIT');
    if (tx && typeof tx.release === 'function') tx.release();
    tx = null;

    const order = orderRes.rows[0];

    // Invalidate products cache so stock updates reflect quickly
    if (clients.redis && typeof clients.redis.del === 'function') {
      try {
        await clients.redis.del('products');
      } catch (e) {
        console.warn(`[${SERVICE_NAME}] Redis cache invalidate failed: ${e.message}`);
      }
    }
    
    // Send email notification
    sendEmailNotification('order_created', {
      email: `user${userId}@example.com`,
      subject: `Order #${order.id} Confirmed`,
      body: `Your order for ${product.name} (qty: ${quantity}) has been placed. Total: $${totalPrice}`,
      metadata: { orderId: order.id, userId, productId, quantity, totalPrice }
    });

    res.status(201).json(order);
  } catch (error) {
    await rollbackAndRelease();
    console.error(`[${SERVICE_NAME}] Error creating order:`, error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.get('/orders', async (req, res) => {
  try {
    const userId = Number(req.query.userId || 0);
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const db = clients.db;
    if (!db) return res.status(503).json({ error: 'Database not ready' });

    // Be robust to schema drift in existing Azure DBs.
    // We try a small sequence of likely schemas and ordering columns.
    const email = `user${userId}@example.com`;
    const candidates = [
      { sql: 'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', params: [userId] },
      { sql: 'SELECT * FROM orders WHERE user_id = $1 ORDER BY id DESC', params: [userId] },
      { sql: 'SELECT * FROM orders WHERE userid = $1 ORDER BY createdat DESC', params: [userId] },
      { sql: 'SELECT * FROM orders WHERE userid = $1 ORDER BY id DESC', params: [userId] },
      { sql: 'SELECT * FROM orders WHERE user_email = $1 ORDER BY created_at DESC', params: [email] },
      { sql: 'SELECT * FROM orders WHERE user_email = $1 ORDER BY id DESC', params: [email] },
    ];

    const normalizeOrderRow = (row) => {
      // Keep response stable across schema variants and avoid duplicated "item" data.
      // Many DBs have both an `items` JSON column and legacy `product_id/quantity/total_price` columns.
      const normalized = { ...row };

      let items = normalized.items;
      if (typeof items === 'string') {
        try {
          items = JSON.parse(items);
        } catch {
          items = null;
        }
      }

      if (!Array.isArray(items) || items.length === 0) {
        // Fallback: synthesize a single-item array from legacy columns.
        const productId = normalized.product_id ?? normalized.productId ?? null;
        const quantity = normalized.quantity ?? 1;
        if (productId != null) {
          items = [{ productId, quantity }];
        } else {
          items = [];
        }
      }

      // De-dupe items by productId (keep first occurrence).
      const seen = new Set();
      normalized.items = items.filter((it) => {
        const key = (it && (it.productId ?? it.product_id)) ?? JSON.stringify(it);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // If we have `items`, remove legacy per-item columns to avoid UI confusion.
      delete normalized.product_id;
      delete normalized.productId;
      delete normalized.quantity;
      delete normalized.total_price;

      return normalized;
    };

    let lastError;
    for (const c of candidates) {
      try {
        const result = await db.query(c.sql, c.params);
        return res.json(result.rows.map(normalizeOrderRow));
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError;
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error fetching orders:`, error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.get('/dispatches', async (req, res) => {
  try {
    const result = await clients.db.query("SELECT * FROM orders WHERE status = 'created' ORDER BY created_at ASC");
    res.json(result.rows);
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error fetching dispatches:`, error);
    res.status(500).json({ error: 'Failed to fetch dispatches' });
  }
});

app.patch('/orders/:id/dispatch', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await clients.db.query(
      "UPDATE orders SET status = 'dispatched', dispatched_at = NOW() WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Order not found' });
    
    const order = result.rows[0];
    
    // Send dispatch notification email
    sendEmailNotification('order_dispatched', {
      email: `user${order.user_id}@example.com`,
      subject: `Order #${order.id} Dispatched`,
      body: `Your order has been dispatched and is on its way!`,
      metadata: { orderId: order.id, userId: order.user_id, dispatchedAt: order.dispatched_at }
    });
    
    res.json(order);
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error dispatching order:`, error);
    res.status(500).json({ error: 'Failed to dispatch order' });
  }
});

app.get('/product-with-user', async (req, res) => {
  console.log(`[${SERVICE_NAME}] /product-with-user requested`);

  try {
    // Get product from database
    const result = await clients.db.query('SELECT id, name, stock, price FROM products ORDER BY id LIMIT 1');
    const product = result.rows[0];

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let user = null;
    try {
      console.log(`[${SERVICE_NAME}] calling user-service at ${process.env.USER_SERVICE_URL}`);
      const USER_SERVICE_URL = resolveUserServiceUrl();
      
      // Attempt to fetch user with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

      let response;
      try {
        response = await fetch(`${USER_SERVICE_URL}/user`, {
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeout);
      }
      
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
    // Schedule daily catalogue/price refresh
    setInterval(updateStockFromSupplier, 24 * 60 * 60 * 1000);
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
