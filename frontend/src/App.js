import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch products
      const productsResponse = await fetch('/products');
      if (!productsResponse.ok) {
        throw new Error('Failed to fetch products');
      }
      const productsData = await productsResponse.json();
      setProducts(productsData);

      // Fetch combined product and user data
      const combinedResponse = await fetch('/product-with-user');
      if (!combinedResponse.ok) {
        throw new Error('Failed to fetch user data');
      }
      const combinedData = await combinedResponse.json();
      setUser(combinedData.user);

    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    fetchData();
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🛍️ ThAmCo E-Commerce Platform</h1>
        <p>Cloud Computing DevOps Assignment - Microservices Demo</p>
      </header>

      <main className="App-main">
        <div className="controls">
          <button onClick={refreshData} disabled={loading}>
            {loading ? '🔄 Refreshing...' : '🔄 Refresh Data'}
          </button>
        </div>

        {error && (
          <div className="error">
            <h3>❌ Error</h3>
            <p>{error}</p>
          </div>
        )}

        {loading && !error && (
          <div className="loading">
            <h3>⏳ Loading...</h3>
            <p>Fetching data from microservices...</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <section className="products-section">
              <h2>📦 Products Catalog</h2>
              <div className="products-grid">
                {products.map(product => (
                  <div key={product.id} className="product-card">
                    <h3>{product.name}</h3>
                    <div className="product-details">
                      <p><strong>Stock:</strong> {product.stock} units</p>
                      <p><strong>Price:</strong> ${product.price}</p>
                      <p><strong>ID:</strong> {product.id}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {user && (
              <section className="user-section">
                <h2>👤 User Information</h2>
                <div className="user-card">
                  <h3>{user.name}</h3>
                  <div className="user-details">
                    <p><strong>ID:</strong> {user.id}</p>
                    <p><strong>Role:</strong> {user.role}</p>
                  </div>
                </div>
              </section>
            )}

            <section className="architecture-section">
              <h2>🏗️ System Architecture</h2>
              <div className="architecture-diagram">
                <div className="service frontend">
                  <h4>🌐 Frontend (React)</h4>
                  <p>User Interface</p>
                </div>
                <div className="arrow">⬇️</div>
                <div className="services">
                  <div className="service product-service">
                    <h4>📦 Product Service</h4>
                    <p>Port 3000</p>
                    <small>PostgreSQL + Redis</small>
                  </div>
                  <div className="service user-service">
                    <h4>👤 User Service</h4>
                    <p>Port 3001</p>
                    <small>PostgreSQL</small>
                  </div>
                </div>
                <div className="arrow">⬇️</div>
                <div className="databases">
                  <div className="database postgres">
                    <h4>🐘 PostgreSQL</h4>
                    <p>Port 5432</p>
                    <small>Persistent Storage</small>
                  </div>
                  <div className="database redis">
                    <h4>🔴 Redis</h4>
                    <p>Port 6379</p>
                    <small>Cache Layer</small>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="App-footer">
        <p>Built with React, Node.js, PostgreSQL, Redis, and Docker</p>
        <p>🚀 Cloud Computing DevOps Assignment - Microservices Architecture</p>
      </footer>
    </div>
  );
}

export default App;