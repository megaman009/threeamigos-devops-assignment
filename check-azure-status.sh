#!/bin/bash

echo "=== Azure Deployment Status ==="
echo ""

echo "📦 Container Apps:"
az containerapp list --resource-group threeamigos-rg --query "[].{Name:name, Status:properties.provisioningState, URL:properties.configuration.ingress.fqdn}" -o table
echo ""

echo "🗄️  PostgreSQL:"
az postgres flexible-server show --name threeamigos-db --resource-group threeamigos-rg --query "{Name:name, State:state, FQDN:fullyQualifiedDomainName}" -o table
echo ""

echo "⚡ Redis:"
REDIS_STATE=$(az redis show --name threeamigos-redis --resource-group threeamigos-rg --query "provisioningState" -o tsv 2>/dev/null)
echo "Status: $REDIS_STATE"

if [ "$REDIS_STATE" = "Succeeded" ]; then
    echo "✅ All resources ready! Next: Configure environment variables"
else
    echo "⏳ Still waiting for Redis to finish provisioning..."
fi
