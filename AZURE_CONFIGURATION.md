# Azure Container Apps Configuration - URGENT FIX NEEDED

## ⚠️ Critical Problem Identified

The Container Apps were deployed with **incorrect environment variable names**.

**What's wrong:** The code expects `DATABASE_URL` and `REDIS_URL` connection strings, but we configured individual variables like `DB_HOST`, `DB_USER`, etc. This is why the services timeout - they can't connect to databases.

Note: Don’t commit real passwords/keys into git. Use placeholders below and paste real values in the Portal/Cloud Shell.

**Azure CLI Status:** SSL connection errors prevent CLI updates from UAE. Must use **Azure Portal** or **Cloud Shell**.

## FASTEST Solution: Azure Cloud Shell (5 minutes)

**Open Cloud Shell:** https://shell.azure.com (uses your browser, bypasses local SSL issues)

### Copy-paste these commands:

```bash
# Get Redis key
REDIS_KEY=$(az redis list-keys --name threeamigos-redis --resource-group threeamigos-rg --query primaryKey -o tsv)

# Update product-service
az containerapp update \
  --name product-service \
  --resource-group threeamigos-rg \
  --set-env-vars \
    "DATABASE_URL=postgresql://<DB_USER>:<DB_PASSWORD>@threeamigos-db.postgres.database.azure.com:5432/postgres?sslmode=require" \
    "REDIS_URL=rediss://:${REDIS_KEY}@threeamigos-redis.redis.cache.windows.net:6380" \
    "USER_SERVICE_URL=https://user-service.happydune-2f7f3502.uaenorth.azurecontainerapps.io" \
    "CORS_ORIGIN=https://frontend.happydune-2f7f3502.uaenorth.azurecontainerapps.io" \
    "NODE_ENV=production"

# Update user-service
az containerapp update \
  --name user-service \
  --resource-group threeamigos-rg \
  --set-env-vars \
    "DATABASE_URL=postgresql://<DB_USER>:<DB_PASSWORD>@threeamigos-db.postgres.database.azure.com:5432/postgres?sslmode=require" \
    "AUTH0_DOMAIN=dev-0dkhahbfgadu44x6.us.auth0.com" \
    "AUTH0_AUDIENCE=https://thamco-user-api" \
    "NODE_ENV=production"

# Test after ~60 seconds
curl https://product-service.happydune-2f7f3502.uaenorth.azurecontainerapps.io/products
```

Wait 60 seconds between update and test for containers to restart.

---

## Alternative: Azure Portal (Manual - 15 minutes)

### 1. Product Service Environment Variables

Go to: **Azure Portal → threeamigos-rg → product-service → Environment variables**

**Remove these variables:**

- DB_HOST
- DB_USER
- DB_PASSWORD
- DB_NAME
- REDIS_HOST
- REDIS_PORT
- REDIS_PASSWORD

**Add these instead:**

| Name             | Value                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| DATABASE_URL     | `postgresql://<DB_USER>:<DB_PASSWORD>@threeamigos-db.postgres.database.azure.com:5432/postgres?sslmode=require` |
| REDIS_URL        | `rediss://:<REDIS_PRIMARY_KEY>@threeamigos-redis.redis.cache.windows.net:6380`                                  |
| USER_SERVICE_URL | `https://user-service.happydune-2f7f3502.uaenorth.azurecontainerapps.io`                                        |
| CORS_ORIGIN      | `https://frontend.happydune-2f7f3502.uaenorth.azurecontainerapps.io`                                            |
| NODE_ENV         | `production`                                                                                                    |

**Get Redis Key:** Azure Portal → threeamigos-rg → threeamigos-redis → Access keys → Primary

### 2. User Service Environment Variables

Go to: **Azure Portal → threeamigos-rg → user-service → Environment variables**

**Remove these variables:**

- DB_HOST
- DB_USER
- DB_PASSWORD
- DB_NAME

**Add these instead:**

| Name           | Value                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| DATABASE_URL   | `postgresql://<DB_USER>:<DB_PASSWORD>@threeamigos-db.postgres.database.azure.com:5432/postgres?sslmode=require` |
| AUTH0_DOMAIN   | `dev-0dkhahbfgadu44x6.us.auth0.com`                                                                             |
| AUTH0_AUDIENCE | `https://thamco-user-api`                                                                                       |
| NODE_ENV       | `production`                                                                                                    |

### 3. Frontend Environment Variables

Go to: **Azure Portal → threeamigos-rg → frontend → Environment variables**

**Keep/verify these:**

| Name                          | Value                                                                       |
| ----------------------------- | --------------------------------------------------------------------------- |
| REACT_APP_PRODUCT_SERVICE_URL | `https://product-service.happydune-2f7f3502.uaenorth.azurecontainerapps.io` |
| REACT_APP_USER_SERVICE_URL    | `https://user-service.happydune-2f7f3502.uaenorth.azurecontainerapps.io`    |
| REACT_APP_AUTH0_DOMAIN        | `dev-0dkhahbfgadu44x6.us.auth0.com`                                         |
| REACT_APP_AUTH0_CLIENT_ID     | `4oJtRBSJyjDq2dgD0nzzmzVqipCtLEvX`                                          |
| REACT_APP_AUTH0_AUDIENCE      | `https://thamco-user-api`                                                   |

## Important Notes

1. **Redis URL format:** `rediss://` (note the double 's' for SSL)
2. **PostgreSQL SSL:** `?sslmode=require` parameter is required for Azure
3. **After updating:** Each Container App will automatically create a new revision and restart (~60 seconds)
4. **Verify:** Test endpoints after restart completes

## Testing After Configuration

```bash
# Test product service
curl https://product-service.happydune-2f7f3502.uaenorth.azurecontainerapps.io/health
curl https://product-service.happydune-2f7f3502.uaenorth.azurecontainerapps.io/products

# Test user service
curl https://user-service.happydune-2f7f3502.uaenorth.azurecontainerapps.io/health

# Test frontend (open in browser)
https://frontend.happydune-2f7f3502.uaenorth.azurecontainerapps.io
```

## Alternative: CLI Commands (if SSL connection improves)

```bash
# Get Redis key
REDIS_KEY=$(az redis list-keys --name threeamigos-redis --resource-group threeamigos-rg --query primaryKey -o tsv)

# Update product-service
az containerapp update \
  --name product-service \
  --resource-group threeamigos-rg \
  --set-env-vars \
    "DATABASE_URL=postgresql://<DB_USER>:<DB_PASSWORD>@threeamigos-db.postgres.database.azure.com:5432/postgres?sslmode=require" \
    "REDIS_URL=rediss://:$REDIS_KEY@threeamigos-redis.redis.cache.windows.net:6380" \
    "USER_SERVICE_URL=https://user-service.happydune-2f7f3502.uaenorth.azurecontainerapps.io" \
    "CORS_ORIGIN=https://frontend.happydune-2f7f3502.uaenorth.azurecontainerapps.io" \
    "NODE_ENV=production"

# Update user-service
az containerapp update \
  --name user-service \
  --resource-group threeamigos-rg \
  --set-env-vars \
    "DATABASE_URL=postgresql://<DB_USER>:<DB_PASSWORD>@threeamigos-db.postgres.database.azure.com:5432/postgres?sslmode=require" \
    "AUTH0_DOMAIN=dev-0dkhahbfgadu44x6.us.auth0.com" \
    "AUTH0_AUDIENCE=https://thamco-user-api" \
    "NODE_ENV=production"
```
