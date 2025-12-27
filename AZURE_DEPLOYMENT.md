# Azure Deployment Guide for Three Amigos

## 🚀 Option 1: Automated Setup (Recommended)

If you have Azure CLI working, run:

```bash
./setup-azure.sh
```

This will create all necessary Azure resources automatically.

## 🛠️ Option 2: Manual Setup via Azure Portal

### Step 1: Create Resource Group

1. Go to [Azure Portal](https://portal.azure.com)
2. Search for "Resource groups"
3. Click "Create"
4. Name: `threeamigos-rg`
5. Region: East US
6. Click "Review + create"

### Step 2: Create Azure Container Registry

1. Search for "Container registries"
2. Click "Create"
3. Resource group: `threeamigos-rg`
4. Registry name: `threeamigosacr`
5. Location: East US
6. SKU: Basic
7. Click "Review + create"

### Step 3: Create PostgreSQL Database

1. Search for "Azure Database for PostgreSQL flexible servers"
2. Click "Create"
3. Resource group: `threeamigos-rg`
4. Server name: `threeamigos-postgres`
5. Region: East US
6. Workload type: Development
7. Compute + storage: Burstable, B1ms, 32GB storage
8. Admin username: `postgres`
9. Password: Choose a secure password
10. Click "Review + create"

### Step 4: Create Redis Cache

1. Search for "Azure Cache for Redis"
2. Click "Create"
3. Resource group: `threeamigos-rg`
4. DNS name: `threeamigos-redis`
5. Location: East US
6. Cache type: Basic C0 (256 MB)
7. Click "Review + create"

### Step 5: Create Container Apps Environment

1. Search for "Container Apps"
2. Click "Environment" tab
3. Click "Create"
4. Resource group: `threeamigos-rg`
5. Name: `threeamigos-env`
6. Location: East US
7. Click "Create"

### Step 6: Create Service Principal for GitHub Actions

1. Go to "Azure Active Directory" > "App registrations"
2. Click "New registration"
3. Name: `threeamigos-github-actions`
4. Click "Register"
5. Go to "Certificates & secrets" > "New client secret"
6. Description: `GitHub Actions`
7. Expires: 24 months
8. Copy the secret value
9. Go to "API permissions" > "Add permission" > "Azure Container Registry" > "AcrPush"
10. Grant admin consent

### Step 7: Configure GitHub Secrets

Go to your GitHub repository > Settings > Secrets and variables > Actions

Add these secrets:

```
AZURE_CREDENTIALS: {
  "clientId": "YOUR_APP_ID",
  "clientSecret": "YOUR_CLIENT_SECRET",
  "subscriptionId": "YOUR_SUBSCRIPTION_ID",
  "tenantId": "YOUR_TENANT_ID"
}
AZURE_RESOURCE_GROUP: threeamigos-rg
ACR_NAME: threeamigosacr
DATABASE_URL: postgresql://postgres:YOUR_DB_PASSWORD@threeamigos-postgres.postgres.database.azure.com:5432/thamco
REDIS_URL: redis://threeamigos-redis.redis.cache.windows.net:6380,password=YOUR_REDIS_KEY,ssl=True
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

## 🎯 Expected Result

After deployment, you'll have:

- **Frontend**: https://frontend-xyz.azurecontainerapps.io
- **Product API**: https://product-service-xyz.azurecontainerapps.io
- **User API**: Internal only

## 💰 Cost Information - Azure for Students

### 🎓 **Azure for Students Benefits:**
- **$100 credit** for 12 months
- **Free services** available
- **No credit card required** initially

### 💸 **Realistic Cost Breakdown:**

**Free Tier Options Available:**
- Container Apps: 2 million requests free/month
- Container Registry: First 5GB free
- PostgreSQL: Basic tier might be free for students
- Redis: Basic C0 (256MB) is very cheap

**Paid Services (if needed):**
- Container Apps: ~$0.01/hour × 3 services = ~$0.75/day
- PostgreSQL: ~$0.02/hour = ~$0.48/day
- Redis: ~$0.01/hour = ~$0.24/day
- **Total**: ~$1.47/day (but likely much less with free tiers)

**For a 1-week demo:** ~$10-15 total (covered by student credit)

### 🆓 **Free Alternatives:**

1. **Railway** - Free tier for Node.js apps
2. **Render** - Free PostgreSQL + web services
3. **Fly.io** - Free tier with 256MB RAM
4. **Vercel** - Free for frontend + serverless
5. **GitHub Codespaces** - Free for public repos

### 🎯 **Recommendation:**
- Use **Azure free tiers** first (you have $100 credit)
- Deploy for **3-5 days** only
- **Delete resources** after demo
- Total cost: **$5-10** for your assignment demo

### 🗑️ **How to Delete Resources (Important!):**
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
