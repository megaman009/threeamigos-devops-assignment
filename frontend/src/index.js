import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

import { Auth0Provider } from '@auth0/auth0-react';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Auth0Provider
    domain="dev-0dkhahbfgadu44x6.us.auth0.com"
    clientId="4oJtRBSJyjDq2dgD0nzzmzVqipCtLEvX"
    authorizationParams={{
      redirect_uri: window.location.origin,
      audience: "https://thamco-user-api"
    }}
  >
    <App />
  </Auth0Provider>
);