import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

import { Auth0Provider } from '@auth0/auth0-react';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Auth0Provider
      domain="dev-placeholder.auth0.com"
      clientId="YOUR_CLIENT_ID_HERE"
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: "https://thamco-user-api"
      }}
    >
      <App />
    </Auth0Provider>
  </React.StrictMode>
);