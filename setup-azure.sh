#!/bin/bash

# Three Amigos - Azure Setup Script
# This script sets up Azure resources for the microservices deployment

set -e

echo "🚀 Setting up Azure resources for Three Amigos"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed. Please install it first:"
    echo "curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash"
    exit 1
fi

print_success "Azure CLI is installed"

# Check if logged in
if ! az account show &> /dev/null; then
    print_error "Please login to Azure first:"
    echo "az login"
    exit 1
fi

print_success "Logged in to Azure"

# Get user input
read -p "Enter resource group name [threeamigos-rg]: " RESOURCE_GROUP
RESOURCE_GROUP=${RESOURCE_GROUP:-threeamigos-rg}

read -p "Enter location [eastus]: " LOCATION
LOCATION=${LOCATION:-eastus}

read -p "Enter Azure Container Registry name [threeamigosacr]: " ACR_NAME
ACR_NAME=${ACR_NAME:-threeamigosacr}

print_status "Creating resource group: $RESOURCE_GROUP"
az group create --name $RESOURCE_GROUP --location $LOCATION

print_status "Creating Azure Container Registry: $ACR_NAME"
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic

print_status "Creating Azure Container Apps environment"
az containerapp env create \
  --name threeamigos-env \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

print_status "Creating Azure Database for PostgreSQL"
DB_PASSWORD=$(openssl rand -base64 12)
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name threeamigos-postgres \
  --location $LOCATION \
  --admin-user postgres \
  --admin-password $DB_PASSWORD \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 15 \
  --yes

print_status "Creating Azure Cache for Redis"
az redis create \
  --resource-group $RESOURCE_GROUP \
  --name threeamigos-redis \
  --location $LOCATION \
  --sku Basic \
  --vm-size c0

# Get connection strings
print_status "Getting connection strings..."
DB_HOST=$(az postgres flexible-server show --resource-group $RESOURCE_GROUP --name threeamigos-postgres --query fullyQualifiedDomainName -o tsv)
REDIS_HOST=$(az redis show --resource-group $RESOURCE_GROUP --name threeamigos-redis --query hostName -o tsv)
REDIS_PORT=$(az redis show --resource-group $RESOURCE_GROUP --name threeamigos-redis --query sslPort -o tsv)

DATABASE_URL="postgresql://postgres:$DB_PASSWORD@$DB_HOST:5432/thamco"
REDIS_URL="redis://$REDIS_HOST:$REDIS_PORT,password=$(az redis show --resource-group $RESOURCE_GROUP --name threeamigos-redis --query accessKeys.primaryKey -o tsv),ssl=True"

print_status "Creating Azure Container Apps"

# Product Service
az containerapp create \
  --name product-service \
  --resource-group $RESOURCE_GROUP \
  --environment threeamigos-env \
  --image $ACR_NAME.azurecr.io/product-service:latest \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1Gi \
  --env-vars DATABASE_URL="$DATABASE_URL" \
             REDIS_URL="$REDIS_URL" \
             USER_SERVICE_URL="https://user-service.internal.azurecontainerapps.io"

# User Service
az containerapp create \
  --name user-service \
  --resource-group $RESOURCE_GROUP \
  --environment threeamigos-env \
  --image $ACR_NAME.azurecr.io/user-service:latest \
  --target-port 3001 \
  --ingress internal \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1Gi \
  --env-vars DATABASE_URL="$DATABASE_URL"

# Frontend
az containerapp create \
  --name frontend \
  --resource-group $RESOURCE_GROUP \
  --environment threeamigos-env \
  --image $ACR_NAME.azurecr.io/frontend:latest \
  --target-port 3002 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1Gi

print_success "Azure resources created successfully!"

# Get URLs
FRONTEND_URL=$(az containerapp show --name frontend --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv)
PRODUCT_URL=$(az containerapp show --name product-service --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv)

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo "Frontend: https://$FRONTEND_URL"
echo "Product API: https://$PRODUCT_URL"
echo ""
echo "📝 GitHub Secrets to Configure:"
echo "AZURE_CREDENTIALS: (Service Principal credentials)"
echo "AZURE_RESOURCE_GROUP: $RESOURCE_GROUP"
echo "ACR_NAME: $ACR_NAME"
echo "DATABASE_URL: $DATABASE_URL"
echo "REDIS_URL: $REDIS_URL"
echo ""
echo "Next: Configure these secrets in your GitHub repository settings"