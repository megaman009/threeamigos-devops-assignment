-- Initialize Azure PostgreSQL database (matches current product-service schema)

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_price DECIMAL(10,2) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'created',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  dispatched_at TIMESTAMP NULL
);

-- Seed products only if empty
INSERT INTO products (name, stock, price)
SELECT 'Coffee Beans', 42, 12.99
WHERE NOT EXISTS (SELECT 1 FROM products);

INSERT INTO products (name, stock, price)
SELECT 'Espresso Machine', 5, 299.99
WHERE (SELECT COUNT(*) FROM products) = 1;

SELECT COUNT(*) AS product_count FROM products;
