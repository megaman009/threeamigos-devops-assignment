import React, { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from "@auth0/auth0-react";
import './App.css';

function App() {
  const { loginWithRedirect, logout, user: auth0User, isAuthenticated, isLoading: authLoading, getAccessTokenSilently } = useAuth0();
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderSuccess, setOrderSuccess] = useState(null);

  // API Base URLs from environment (with local defaults)
  // - Product service serves: /products, /orders
  // - User service serves: /user (Auth0 protected)
  const PRODUCT_API_BASE = process.env.REACT_APP_PRODUCT_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:3000';
  const USER_API_BASE = process.env.REACT_APP_USER_API_URL || 'http://localhost:3001';

  // Demo mapping: the backend expects a numeric userId.
  // Keep this configurable without adding extra UI.
  const DEMO_USER_ID = Number(process.env.REACT_APP_DEMO_USER_ID || 1);

  const dedupeProductsById = useCallback((list) => {
    if (!Array.isArray(list)) return [];

    const seen = new Set();
    const out = [];
    for (const item of list) {
      const id = item?.id;
      if (id == null) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(item);
    }
    return out;
  }, []);

  const fetchPublicProducts = useCallback(async () => {
    try {
      setLoading(true);
      const productsResponse = await fetch(`${PRODUCT_API_BASE}/products`);
      if (!productsResponse.ok) throw new Error('Failed to fetch products');
      const productsData = await productsResponse.json();
      setProducts(dedupeProductsById(productsData));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [PRODUCT_API_BASE, dedupeProductsById]);

  const searchProducts = async (query) => {
    if (!query.trim()) {
      fetchPublicProducts();
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${PRODUCT_API_BASE}/products/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setProducts(dedupeProductsById(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        // Check if we're at stock limit
        if (existing.quantity >= product.stock) {
          setError(`Cannot add more - only ${product.stock} in stock!`);
          setTimeout(() => setError(null), 3000);
          return prevCart;
        }
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      // Adding new item
      if (product.stock < 1) {
        setError(`${product.name} is out of stock!`);
        setTimeout(() => setError(null), 3000);
        return prevCart;
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
    setOrderSuccess(`Added ${product.name} to cart!`);
    setTimeout(() => setOrderSuccess(null), 2000);
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }
    
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.id === productId) {
          // Check stock limit
          if (newQuantity > item.stock) {
            setError(`Only ${item.stock} available in stock!`);
            setTimeout(() => setError(null), 3000);
            return item; // Don't update quantity
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const placeOrder = async () => {
    if (!isAuthenticated) {
      alert('Please log in to place an order');
      return;
    }

    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const token = await getAccessTokenSilently();
      
      // Place order for each item in cart
      const orderPromises = cart.map(item =>
        fetch(`${PRODUCT_API_BASE}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: DEMO_USER_ID,
            productId: item.id,
            quantity: item.quantity
          })
        })
      );

      const responses = await Promise.all(orderPromises);
      const allSuccessful = responses.every(r => r.ok);
      
      if (!allSuccessful) {
        throw new Error('Some orders failed to process');
      }

      setOrderSuccess('Order placed successfully! 🎉');
      setCart([]);
      setTimeout(() => setOrderSuccess(null), 5000);
    } catch (err) {
      setError(`Order failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch products (Public)
      const productsResponse = await fetch(`${PRODUCT_API_BASE}/products`);
      const productsData = await productsResponse.json();
      setProducts(dedupeProductsById(productsData));

      // 2. Fetch User Profile (Protected)
      const token = await getAccessTokenSilently();
      const userResponse = await fetch(`${USER_API_BASE}/user`, {
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
  }, [PRODUCT_API_BASE, USER_API_BASE, getAccessTokenSilently, dedupeProductsById]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    } else {
      // If not logged in, we can still fetch public products
      fetchPublicProducts();
    }
  }, [isAuthenticated, fetchData, fetchPublicProducts]);

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
        {orderSuccess && <div className="success"><h3>✅ {orderSuccess}</h3></div>}

        {/* Shopping Cart */}
        {cart.length > 0 && (
          <section className="cart-section">
            <h2>🛒 Shopping Cart ({cart.length} items)</h2>
            <div className="cart-items">
              {cart.map(item => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-info">
                    <h4>{item.name}</h4>
                    <p>${item.price} each</p>
                  </div>
                  <div className="cart-item-controls">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                    <button className="remove-btn" onClick={() => removeFromCart(item.id)}>Remove</button>
                  </div>
                  <div className="cart-item-total">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-summary">
              <h3>Total: ${cartTotal.toFixed(2)}</h3>
              <button 
                className="checkout-btn" 
                onClick={placeOrder}
                disabled={loading || !isAuthenticated}
              >
                {isAuthenticated ? 'Place Order' : 'Log in to checkout'}
              </button>
            </div>
          </section>
        )}

        {/* Product Search */}
        <section className="search-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchProducts(searchQuery)}
            />
            <button onClick={() => searchProducts(searchQuery)}>🔍 Search</button>
            <button onClick={() => { setSearchQuery(''); fetchPublicProducts(); }}>Clear</button>
          </div>
        </section>

        {loading && <div className="loading"><h3>⏳ Loading...</h3></div>}

        {/* Products Grid */}
        {!loading && (
          <>
            <section className="products-section">
              <h2>📦 Products Catalog</h2>
              <div className="products-grid">
                {products.length > 0 ? products.map(product => (
                  <div key={product.id} className="product-card">
                    <h3>{product.name}</h3>
                    <p className="price">💰 ${product.price}</p>
                    <p className="stock">📦 Stock: {product.stock}</p>
                    <div className="product-actions">
                      <button 
                        className="details-btn" 
                        onClick={() => setSelectedProduct(product)}
                      >
                        View Details
                      </button>
                      <button 
                        className="add-btn" 
                        onClick={() => addToCart(product)}
                        disabled={product.stock === 0}
                      >
                        {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                      </button>
                    </div>
                  </div>
                )) : <p>No products found.</p>}
              </div>
            </section>

            {/* Product Detail Modal */}
            {selectedProduct && (
              <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <button className="modal-close" onClick={() => setSelectedProduct(null)}>✕</button>
                  <h2>{selectedProduct.name}</h2>
                  <p className="modal-price">Price: ${selectedProduct.price}</p>
                  <p className="modal-stock">Available Stock: {selectedProduct.stock}</p>
                  <p className="modal-description">
                    High-quality product from ThAmCo marketplace.
                  </p>
                  <button 
                    className="modal-add-btn" 
                    onClick={() => {
                      addToCart(selectedProduct);
                      setSelectedProduct(null);
                    }}
                    disabled={selectedProduct.stock === 0}
                  >
                    {selectedProduct.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                  </button>
                </div>
              </div>
            )}

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
                <p>🔒 Log in to place orders and view your profile.</p>
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
