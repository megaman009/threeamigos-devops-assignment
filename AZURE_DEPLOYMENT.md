# Deploying ThAmCo to Azure

This guide shows how to get ThAmCo's e-commerce system running in the cloud on Microsoft Azure.

## Why Azure?

For ThAmCo's startup, Azure makes sense because:

- Pay only for what you use (important for a new business)
- Can easily scale up when more customers come
- Built-in security and backups
- Global data centers (can serve customers anywhere)

## What We'll Deploy

- **Product Service** → Azure Container Apps
- **User Service** → Azure Container Apps
- **Frontend** → Containerized React app (Azure Container Apps)
- **PostgreSQL Database** → Azure Database for PostgreSQL
- **Redis Cache (optional)** → used locally via Docker Compose; on Azure it depends on subscription support

## 🚀 Quick Deploy (If You Have Azure CLI)

Run this script and it handles everything:

```bash
./setup-azure.sh
```

It creates the core resources (resource group, ACR, Container Apps, Postgres). If Redis creation fails due to subscription restrictions, you can still deploy without it (product caching is optional).

## 📋 Manual Deployment (Step by Step)

If you want to understand what's happening or the script doesn't work, follow these steps:

### Step 1: Create a Resource Group

Think of this as a folder for all ThAmCo's cloud stuff.

1. Go to [Azure Portal](https://portal.azure.com)
2. Search for "Resource groups"
3. Click "Create"
4. **Resource group name**: `threeamigos-rg`
5. **Region**: pick the closest region to you (this repo’s live demo uses **UAE North**)
6. Click "Review + create" → "Create"

### Step 2: Set Up the Database

ThAmCo needs a place to store products and orders.

1. Search for "Azure Database for PostgreSQL flexible servers"
2. Click "Create"
3. **Resource group**: Select `threeamigos-rg`
4. **Server name**: `threeamigos-postgres` (has to be unique)
5. **Region**: same as your resource group
6. **PostgreSQL version**: 15
7. **Workload type**: Development (cheaper for testing)
8. **Compute + storage**: Burstable, B1ms, 32 GB storage
9. **Admin username**: `postgres`
10. **Password**: Pick a strong password (write it down!)
11. **Networking tab**:

- Allow public access (fine for a student demo)
- Add your current IP so you can connect if needed

### Step 3: (Optional) Redis

Redis is used as an optional cache in this project.

- Locally: Redis runs in `docker-compose.yml`.
- On Azure: Azure Cache for Redis may be blocked on some student subscriptions unless the `Microsoft.Cache` resource provider is registered.

If Redis is not available on your subscription, deploy without it (product-service will still work; it will just skip caching).

**"Redis connection failed"**

- If you deployed Azure Cache for Redis, check the Redis resource status in the Portal
- Verify `REDIS_URL` format: `rediss://:<REDIS_PRIMARY_KEY>@<hostname>:6380`
- If you did not deploy Redis (common on student subscriptions), remove/omit Redis env vars so caching is disabled

**"Auth0 login loops"**

- Check callback URLs match exactly
- Clear browser cookies and try again
- Verify Auth0 domain in environment variables

**Services can't talk to each other**

- Use public IP addresses for inter-service communication
- Or set up Azure Virtual Network (more complex but more secure)

## Next Steps After Deployment

Once ThAmCo is running in Azure:

1. **Set up monitoring**: Use Azure Monitor to track errors and performance
2. **Configure backups**: Enable automatic backups for PostgreSQL
3. **Add custom domain**: Point www.thamco.com to your Azure frontend
4. **Set up CI/CD**: GitHub Actions can auto-deploy when you push code
5. **Scale up**: When traffic grows, upgrade container sizes or add more instances

## Why This Setup Works for ThAmCo

- **Microservices**: If products go down, users can still browse
- **Managed databases**: Azure handles backups and updates
- **Easy scaling**: Click a button to handle more customers
- **Global reach**: Can add regions when expanding internationally
- **Cost-effective**: Only pay for what ThAmCo actually uses

## Cleanup

Delete the resource group when you're done:

```bash
az group delete --name threeamigos-rg --yes
```

### Step 8: Push Code to Trigger Deployment

```bash
git add .
git commit -m "Add Azure deployment configuration"
git push origin main
```

The GitHub Actions workflow will automatically:

- Run tests
- Scan for security issues
- Build and push Docker images to ACR
- Deploy to Azure Container Apps
- Provide live URLs

## GitHub Actions Deploy Stage (3rd Pipeline Stage)

The repository includes a third pipeline stage (`deploy`) in [./.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml). It is gated and will only run when the required GitHub secrets are configured.

### Required GitHub Secrets

Set these in **GitHub → Settings → Secrets and variables → Actions → New repository secret**:

- `AZURE_CLIENT_ID`: Client ID of the Azure identity used by GitHub OIDC
- `AZURE_TENANT_ID`: Azure tenant ID
- `AZURE_SUBSCRIPTION_ID`: Azure subscription ID
- `AZURE_RESOURCE_GROUP`: resource group name (example: `threeamigos-rg`)
- `ACR_NAME`: Azure Container Registry name (example: `threeamigosacr`)

The frontend container build also requires build-time API URLs:

- `REACT_APP_PRODUCT_API_URL`: public product API base URL (example: `https://product-service.<suffix>.azurecontainerapps.io`)
- `REACT_APP_USER_API_URL`: public user API base URL (example: `https://user-service.<suffix>.azurecontainerapps.io`)
- `REACT_APP_DEMO_USER_ID` (optional): demo user id (example: `1`)

### Azure authentication (OIDC)

This repo is set up to deploy using **GitHub Actions OIDC** (no long-lived `AZURE_CREDENTIALS` secret). The Azure identity used by GitHub Actions must:

- Have a **federated credential** for the GitHub repo/branch
- Have RBAC:
  - **Contributor** on the resource group
  - **AcrPush** on the container registry

## 🎯 Expected Result

After deployment, you'll have:

- **Frontend**: https://frontend-xyz.azurecontainerapps.io
- **Product API**: https://product-service-xyz.azurecontainerapps.io
- **User API**: https://user-service-xyz.azurecontainerapps.io

## Cost / cleanup notes (student demo)

Azure costs vary by region and SKU. For this assignment, the safest approach is to deploy for a short demo window and then delete the resource group.

### Delete resources

```bash
# Delete entire resource group (removes everything)
az group delete --name threeamigos-rg --yes

# Or delete individual services:
az containerapp delete --name frontend --resource-group threeamigos-rg
az containerapp delete --name product-service --resource-group threeamigos-rg
az containerapp delete --name user-service --resource-group threeamigos-rg
az postgres flexible-server delete --name threeamigos-postgres --resource-group threeamigos-rg --yes
az redis delete --name threeamigos-redis --resource-group threeamigos-rg --yes
```

## 🔍 Monitoring Your Deployment

- Go to Azure Portal > Container Apps
- View logs, metrics, and scaling
- Monitor costs in Cost Management

This professional cloud deployment will impress your teacher and demonstrate real DevOps skills! 🚀
