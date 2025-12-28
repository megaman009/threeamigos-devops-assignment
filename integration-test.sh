#!/bin/bash
# Weekly Integration Test Script
# Automates the setup, testing, and teardown of the dev environment.

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Starting Integration Tests...${NC}"

# Fix for Fedora/Podman socket issues
if [ -z "$DOCKER_HOST" ] && [ -S "$XDG_RUNTIME_DIR/podman/podman.sock" ]; then
    export DOCKER_HOST="unix://$XDG_RUNTIME_DIR/podman/podman.sock"
    echo "Using Podman socket: $DOCKER_HOST"
fi

# 1. Spin up Environment
echo "Starting Docker containers..."
docker-compose up -d --build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to start containers${NC}"
    exit 1
fi

# Wait for services to be ready
echo "Waiting for services to initialize (15s)..."
sleep 15

# 2. Test Product Service (Public)
echo "TEST 1: Fetching Products (Public)..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/products)
if [ "$HTTP_STATUS" == "200" ]; then
    echo -e "${GREEN}✅ Product Service is reachable (200 OK)${NC}"
else
    echo -e "${RED}❌ Product Service failed (Status: $HTTP_STATUS)${NC}"
    exit 1
fi

# 3. Test Resilience (Product with User)
# Expected: 200 OK, but User field should contain fallback message (because we have no auth token)
echo "TEST 2: Testing Resilience (Product + User Fallback)..."
RESPONSE=$(curl -s http://localhost:3000/product-with-user)
if echo "$RESPONSE" | grep -q "Unavailable (Resilience Fallback)"; then
    echo -e "${GREEN}✅ Resilience Check Passed: Fallback message received${NC}"
else
    echo -e "${RED}❌ Resilience Check Failed: Did not receive fallback message${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

# 4. Test Security (User Service Protected)
echo "TEST 3: Testing Security (Accessing User without Token)..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/user)
if [ "$HTTP_STATUS" == "401" ]; then
    echo -e "${GREEN}✅ Security Check Passed: Access denied (401 Unauthorized)${NC}"
else
    echo -e "${RED}❌ Security Check Failed: Expected 401, got $HTTP_STATUS${NC}"
    exit 1
fi

# 5. Teardown
echo "🧹 Cleaning up..."
docker-compose down

echo -e "${GREEN}🎉 All Integration Tests Passed!${NC}"
exit 0
