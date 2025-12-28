import React, { useState, useEffect } from 'react';
import { useAuth0 } from "@auth0/auth0-react";
import './App.css';

function App() {
  const { loginWithRedirect, logout, user: auth0User, isAuthenticated, isLoading: authLoading, getAccessTokenSilently } = useAuth0();
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false); // Managed manually for data fetch
  const [error, setError] = useState(null);

  // API Base URL from environment (or default to localhost:3000 for local dev)
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    } else {
      // If not logged in, we can still fetch public products
      fetchPublicProducts();
    }
  }, [isAuthenticated]);

  const fetchPublicProducts = async () => {
    try {
      setLoading(true);
      const productsResponse = await fetch(`${API_BASE}/products`);
      if (!productsResponse.ok) throw new Error('Failed to fetch products');
      const productsData = await productsResponse.json();
      setProducts(productsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch products (Public)
      const productsResponse = await fetch(`${API_BASE}/products`);
      const productsData = await productsResponse.json();
      setProducts(productsData);

      // 2. Fetch User Profile (Protected)
      const token = await getAccessTokenSilently();
      const userResponse = await fetch(`${API_BASE}/user`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }
      const userData = await userResponse.json();
      setUser(userData);

    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="loading"><div>Loading authentication...</div></div>;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>🛍️ ThAmCo E-Commerce</h1>
        <div className="auth-buttons">
          {!isAuthenticated ? (
            <button className="login-btn" onClick={() => loginWithRedirect()}>Log In</button>
          ) : (
            <div className="user-menu">
              <span>Welcome, {auth0User?.name}</span>
              <button className="logout-btn" onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
                Log Out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="App-main">
        {error && <div className="error"><h3>❌ Error</h3><p>{error}</p></div>}

        {loading && <div className="loading"><h3>⏳ Loading...</h3></div>}

        {!loading && (
          <>
            <section className="products-section">
              <h2>📦 Products Catalog</h2>
              <div className="products-grid">
                {products.length > 0 ? products.map(product => (
                  <div key={product.id} className="product-card">
                    <h3>{product.name}</h3>
                    <p>Price: ${product.price}</p>
                    <p>Stock: {product.stock}</p>
                  </div>
                )) : <p>No products available.</p>}
              </div>
            </section>

            {isAuthenticated && user && (
              <section className="user-section">
                <h2>👤 Your Profile (Secure)</h2>
                <div className="user-card">
                  <h3>{user.name}</h3>
                  <p>Email: {user.email}</p>
                  <p>Role: {user.role}</p>
                  <small>{user.message}</small>
                </div>
              </section>
            )}

            {!isAuthenticated && (
              <section className="guest-notice">
                <p>🔒 Log in to view your profile and account details.</p>
              </section>
            )}
          </>
        )}
      </main>

      <footer className="App-footer">
        <p>ThAmCo Stage 2 - Secure Microservices</p>
      </footer>
    </div>
  );
}

export default App;