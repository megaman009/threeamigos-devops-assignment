# Deploying ThAmCo to Azure

This guide shows how to get ThAmCo's e-commerce system running in the cloud on Microsoft Azure.

## Why Azure?

For ThAmCo's startup, Azure makes sense because:

- Pay only for what you use (important for a new business)
- Can easily scale up when more customers come
- Built-in security and backups
- Global data centers (can serve customers anywhere)

## What We'll Deploy

- **Product Service** → Azure Container Instance
- **User Service** → Azure Container Instance
- **Frontend** → Azure Static Web App (or Container Instance)
- **PostgreSQL Database** → Azure Database for PostgreSQL
- **Redis Cache** → Azure Cache for Redis

## 🚀 Quick Deploy (If You Have Azure CLI)

Run this script and it handles everything:

```bash
./setup-azure.sh
```

It creates all the resources ThAmCo needs automatically.

## 📋 Manual Deployment (Step by Step)

If you want to understand what's happening or the script doesn't work, follow these steps:

### Step 1: Create a Resource Group

Think of this as a folder for all ThAmCo's cloud stuff.

1. Go to [Azure Portal](https://portal.azure.com)
2. Search for "Resource groups"
3. Click "Create"
4. **Resource group name**: `threeamigos-rg`
5. **Region**: East US (or closest to you)
6. Click "Review + create" → "Create"

### Step 2: Set Up the Database

ThAmCo needs a place to store products and orders.

1. Search for "Azure Database for PostgreSQL flexible servers"
2. Click "Create"
3. **Resource group**: Select `threeamigos-rg`
4. **Server name**: `threeamigos-postgres` (has to be unique)
5. **Region**: East US
6. **PostgreSQL version**: 15
7. **Workload type**: Development (cheaper for testing)
8. **Compute + storage**: Burstable, B1ms, 32 GB storage
9. **Admin username**: `postgres`
10. **Password**: Pick a strong password (write it down!)
11. **Networking tab**:
    - Allow public access from Azure services: Yes
    - Add current client IP address: Yes
12. Click "Review + create" → "Create"

Wait a few minutes for it to finish.

### Step 3: Set Up Redis Cache

Redis makes ThAmCo's product pages load faster by caching data.

1. Search for "Azure Cache for Redis"
2. Click "Create"
3. **Resource group**: `threeamigos-rg`
4. **DNS name**: `threeamigos-redis` (has to be unique)
5. **Location**: East US
6. **Cache type**: Basic C0 (250 MB) - enough for testing
7. Click "Review + create" → "Create"

This also takes a few minutes.

### Step 4: Deploy the Services

Now we need to get our code running in Azure. There are a few ways to do this:

**Option A: Using Azure Container Instances (Easier)**

For each service (product-service and user-service):

1. Search for "Container instances"
2. Click "Create"
3. **Resource group**: `threeamigos-rg`
4. **Container name**: `product-service` (or `user-service`)
5. **Region**: East US
6. **Image source**: Docker Hub or Other registry
7. **Image**: Your Docker Hub username + image name
8. **OS type**: Linux
9. **Size**: 1 vCPU, 1.5 GB memory
10. **Networking tab**:
    - **Public IP**: Enabled
    - **Port**: 3000 (for product) or 3001 (for user)
11. **Environment variables tab**: Add these:
    - `DATABASE_URL`: Get from PostgreSQL connection string
    - `REDIS_URL`: Get from Redis access keys
    - `AUTH0_AUDIENCE`: Your Auth0 API audience
    - `AUTH0_ISSUER_BASE_URL`: Your Auth0 domain
12. Click "Review + create" → "Create"

**Option B: Using the Deploy Script**

If you have Azure CLI installed:

```bash
./deploy.sh
```

### Step 5: Configure Auth0 for Production

ThAmCo's login won't work in Azure until we update Auth0:

1. Go to your [Auth0 Dashboard](https://manage.auth0.com/)
2. Go to your Application settings
3. Add your Azure URLs to:
   - **Allowed Callback URLs**:
     - Add your Azure frontend URL + `/callback`
     - Example: `https://threeamigos-frontend.azurewebsites.net/callback`
   - **Allowed Logout URLs**:
     - Add your Azure frontend URL
   - **Allowed Web Origins**:
     - Add your Azure frontend URL
4. Click "Save Changes"

### Step 6: Test It

1. Go to your frontend URL (from Azure Container Instance or App Service)
2. Try browsing products
3. Try logging in
4. Try placing an order

If something doesn't work, check the logs in Azure Portal → Container Instance → Logs.

## What It Costs

For ThAmCo's MVP running on Azure (rough monthly costs):

- PostgreSQL (Burstable B1ms): ~$15/month
- Redis (Basic C0): ~$17/month
- Container Instances (2 services): ~$30/month
- **Total**: About $60-70/month

This is way cheaper than running your own servers, and you can scale up when ThAmCo gets more customers.

## Troubleshooting Common Issues

**"Can't connect to database"**

- Check firewall rules in PostgreSQL settings
- Make sure "Allow Azure services" is enabled
- Verify DATABASE_URL is correct

**"Redis connection failed"**

- Check if Redis is running (portal shows status)
- Verify REDIS_URL format: `redis://[password]@[hostname]:6380`
- Make sure SSL is enabled in connection string

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

Good luck with the deployment! 🚀
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

````

### Step 8: Push Code to Trigger Deployment

```bash
git add .
git commit -m "Add Azure deployment configuration"
git push origin main
````

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
