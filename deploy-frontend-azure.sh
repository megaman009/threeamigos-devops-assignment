#!/usr/bin/env bash
set -euo pipefail

# Azure CLI in some environments can intermittently reset TLS connections.
# These environment variables enable Azure SDK retries/backoff underneath `az`.
export AZURE_CORE_RETRY_MODE=${AZURE_CORE_RETRY_MODE:-exponential}
export AZURE_CORE_RETRY_TOTAL=${AZURE_CORE_RETRY_TOTAL:-20}
export AZURE_CORE_RETRY_BACKOFF_MAX=${AZURE_CORE_RETRY_BACKOFF_MAX:-60}
export AZURE_CORE_HTTP_CONNECTION_TIMEOUT=${AZURE_CORE_HTTP_CONNECTION_TIMEOUT:-30}
export AZURE_CORE_HTTP_TIMEOUT=${AZURE_CORE_HTTP_TIMEOUT:-120}

SKIP_WAIT=${SKIP_WAIT:-false}

# Optional: limit what gets deployed to reduce Azure CLI calls.
# Usage examples:
#   DEPLOY_ONLY=frontend FRONTEND_IMAGE_TAG=v3 ./deploy-frontend-azure.sh
#   DEPLOY_PRODUCT=false ./deploy-frontend-azure.sh
DEPLOY_ONLY=${DEPLOY_ONLY:-}
DEPLOY_PRODUCT=${DEPLOY_PRODUCT:-true}
DEPLOY_USER=${DEPLOY_USER:-true}
DEPLOY_FRONTEND=${DEPLOY_FRONTEND:-true}

if [[ -n "${DEPLOY_ONLY}" ]]; then
  case "${DEPLOY_ONLY}" in
    frontend)
      DEPLOY_PRODUCT=false
      DEPLOY_USER=false
      DEPLOY_FRONTEND=true
      ;;
    product)
      DEPLOY_PRODUCT=true
      DEPLOY_USER=false
      DEPLOY_FRONTEND=false
      ;;
    user)
      DEPLOY_PRODUCT=false
      DEPLOY_USER=true
      DEPLOY_FRONTEND=false
      ;;
    *)
      echo "Unknown DEPLOY_ONLY='${DEPLOY_ONLY}'. Use: frontend|product|user" >&2
      exit 2
      ;;
  esac
fi

RG=${RG:-threeamigos-rg}
ENV_NAME=${ENV_NAME:-threeamigos-env}
ACR_NAME=${ACR_NAME:-threeamigosacr}
ACR_SERVER=${ACR_SERVER:-threeamigosacr.azurecr.io}

PRODUCT_IMAGE_TAG=${PRODUCT_IMAGE_TAG:-v2}
USER_IMAGE_TAG=${USER_IMAGE_TAG:-v2}
FRONTEND_IMAGE_TAG=${FRONTEND_IMAGE_TAG:-v2}

PRODUCT_URL=${PRODUCT_URL:-https://product-service.happydune-2f7f3502.uaenorth.azurecontainerapps.io}
USER_URL=${USER_URL:-https://user-service.happydune-2f7f3502.uaenorth.azurecontainerapps.io}

retry() {
  local -r max_attempts=${1:?max_attempts}
  shift
  local attempt=1
  while true; do
    if "$@"; then
      return 0
    fi
    if [[ $attempt -ge $max_attempts ]]; then
      echo "Command failed after ${attempt} attempts: $*" >&2
      return 1
    fi
    local sleep_s=$((attempt * 5))
    echo "Retry ${attempt}/${max_attempts} failed; sleeping ${sleep_s}s..." >&2
    sleep "${sleep_s}"
    attempt=$((attempt + 1))
  done
}

retry_capture() {
  local -r max_attempts=${1:?max_attempts}
  shift
  local attempt=1
  local out
  while true; do
    if out=$("$@" 2>/dev/null); then
      printf '%s' "$out"
      return 0
    fi
    if [[ $attempt -ge $max_attempts ]]; then
      echo "Command failed after ${attempt} attempts: $*" >&2
      return 1
    fi
    local sleep_s=$((attempt * 5))
    echo "Retry ${attempt}/${max_attempts} failed; sleeping ${sleep_s}s..." >&2
    sleep "${sleep_s}"
    attempt=$((attempt + 1))
  done
}

wait_containerapp_ready() {
  local -r name=${1:?containerapp_name}
  local -r max_attempts=${2:-30}

  if [[ "${SKIP_WAIT}" == "true" ]]; then
    echo "Skipping readiness wait for ${name}."
    return 0
  fi

  echo "Waiting for ${name} to become Ready..."
  local attempt=1
  while true; do
    # We use a single show call (cheap) and parse key properties.
    # If the CLI flakes, retry_capture will handle it.
    local state
    state=$(retry_capture 6 az containerapp show --only-show-errors --name "$name" --resource-group "$RG" --query "{p:properties.provisioningState,r:properties.runningStatus,rev:properties.latestReadyRevisionName}" -o tsv || true)

    # Expected format is 3 lines in TSV; but if it fails, it may be empty.
    if [[ -n "${state}" ]]; then
      local provisioning running readyRev
      provisioning=$(echo "$state" | sed -n '1p' | tr -d '\r')
      running=$(echo "$state" | sed -n '2p' | tr -d '\r')
      readyRev=$(echo "$state" | sed -n '3p' | tr -d '\r')

      if [[ "${provisioning}" == "Succeeded" && "${running}" == "Running" && -n "${readyRev}" ]]; then
        echo "${name} is Ready (${readyRev})."
        return 0
      fi
    fi

    if [[ $attempt -ge $max_attempts ]]; then
      echo "Timed out waiting for ${name} to be Ready." >&2
      return 1
    fi

    sleep 5
    attempt=$((attempt + 1))
  done
}

echo "Fetching ACR password..."
ACR_PASSWORD=$(retry_capture 8 az acr credential show --only-show-errors --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

if [[ "${DEPLOY_PRODUCT}" == "true" ]]; then
  echo "Updating product-service env (CORS + USER_SERVICE_URL)..."
  retry 12 az containerapp update \
    --only-show-errors \
    --name product-service \
    --resource-group "$RG" \
    --image "$ACR_SERVER/product-service:${PRODUCT_IMAGE_TAG}" \
    --set-env-vars \
      "CORS_ORIGIN=*" \
      "USER_SERVICE_URL=$USER_URL" \
      "NODE_ENV=production" \
    --no-wait \
    -o none
  wait_containerapp_ready product-service 40
fi

if [[ "${DEPLOY_USER}" == "true" ]]; then
  echo "Updating user-service (image v2 + CORS + DEFAULT_FUNDS)..."
  retry 12 az containerapp update \
    --only-show-errors \
    --name user-service \
    --resource-group "$RG" \
    --image "$ACR_SERVER/user-service:${USER_IMAGE_TAG}" \
    --set-env-vars \
      "CORS_ORIGIN=*" \
      "DEFAULT_FUNDS=1000" \
      "AUTH0_AUDIENCE=https://thamco-user-api" \
      "AUTH0_ISSUER_BASE_URL=https://dev-0dkhahbfgadu44x6.us.auth0.com/" \
      "NODE_ENV=production" \
    --no-wait \
    -o none
  wait_containerapp_ready user-service 40
fi

if [[ "${DEPLOY_FRONTEND}" == "true" ]]; then
  echo "Deploying frontend (image ${FRONTEND_IMAGE_TAG})..."
if az containerapp show --only-show-errors --name frontend --resource-group "$RG" -o none 2>/dev/null; then
  retry 12 az containerapp update \
    --only-show-errors \
    --name frontend \
    --resource-group "$RG" \
    --image "$ACR_SERVER/frontend:${FRONTEND_IMAGE_TAG}" \
    --no-wait \
    -o none
else
  retry 12 az containerapp create \
    --only-show-errors \
    --name frontend \
    --resource-group "$RG" \
    --environment "$ENV_NAME" \
    --image "$ACR_SERVER/frontend:${FRONTEND_IMAGE_TAG}" \
    --registry-server "$ACR_SERVER" \
    --registry-username "$ACR_NAME" \
    --registry-password "$ACR_PASSWORD" \
    --target-port 3002 \
    --ingress external \
    --cpu 0.25 --memory 0.5Gi \
    --no-wait \
    -o none
fi

  wait_containerapp_ready frontend 50

  FRONTEND_FQDN=$(retry_capture 10 az containerapp show --only-show-errors --name frontend --resource-group "$RG" --query properties.configuration.ingress.fqdn -o tsv)

  echo ""
  echo "Frontend URL: https://${FRONTEND_FQDN}/"
  echo "Product API:  ${PRODUCT_URL}"
  echo "User API:     ${USER_URL}"
fi
