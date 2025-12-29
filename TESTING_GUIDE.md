# How to Test the ThAmCo System

**Quick start guide for testing the system locally**

## 1. Start Everything

```bash
# Start all containers
podman-compose up -d

# Wait a few seconds for services to start
sleep 10

# Check everything is running
podman ps
```

You should see 5 containers running:

- postgres (port 5432)
- redis (port 6379)
- user-service (port 3001)
- product-service (port 3000)
- frontend (port 3002)

## 2. Test the Backend APIs

### Product Browsing (Public - No Login Required)

```bash
# Get all products
curl http://localhost:3000/products

# Search for products
curl "http://localhost:3000/products/search?q=coffee"

# Health check
curl http://localhost:3000/health
```

### User Service

```bash
# Register a new user (no login required)
curl -X POST http://localhost:3001/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Check user service health
curl http://localhost:3001/health

# Check account funds (mock endpoint)
curl "http://localhost:3001/funds?userId=1"
```

### Test Resilience

```bash
# This endpoint shows resilience - calls user service with timeout
curl http://localhost:3000/product-with-user

# You'll see it returns product data with "Unavailable (Resilience Fallback)" for user
# because user service requires authentication
```

## 3. Test the Frontend

Open your browser and go to:

```
http://localhost:3002
```

**What you can do WITHOUT logging in:**

- ✅ Browse products
- ✅ See product names, prices, stock
- ✅ Use the search feature

**What requires Auth0 login:**

- ❌ View user profile
- ❌ See account funds
- ❌ Place orders

**Note:** Auth0 login uses placeholder credentials in `frontend/src/index.js`. To actually log in, you'd need:

1. Create a free Auth0 account
2. Create an application in Auth0
3. Update `domain` and `clientId` in `frontend/src/index.js`
4. Rebuild the frontend

For demo purposes, the system shows how Auth0 integration works even with placeholders.

## 4. Test Integration Script

Run the automated integration tests:

```bash
chmod +x integration-test.sh
./integration-test.sh
```

This will:

- Start all services
- Test health endpoints
- Test product listing
- Test search
- Test user registration
- Clean up afterwards

## 5. Run Unit Tests

Test each service individually:

```bash
# Product Service tests
cd product-service
npm test

# User Service tests
cd ../user-service
npm test
```

Expected results:

- Product Service: 13/13 tests passing
- User Service: 12/12 tests passing

## 6. Test Features from Assignment Scenario

### Public Users Can:

✅ **Browse products:** `curl http://localhost:3000/products`
✅ **Search products:** `curl "http://localhost:3000/products/search?q=coffee"`
✅ **Register:** `curl -X POST http://localhost:3001/users/register -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"pass"}'`

### Stock Updates Every 5 Minutes:

✅ The product service automatically updates stock from the mock supplier API every 5 minutes (check logs)

### Mock Supplier Integration:

✅ **Test supplier sync:** `curl http://localhost:3000/sync-supplier`

- Returns products from multiple suppliers
- System picks cheapest price
- Adds 10% markup

### Email Notifications:

✅ Check logs when creating orders - you'll see email notifications logged:

```bash
podman logs threeamigos-product-service-1 | grep "EMAIL SENT"
```

## 7. Stop Everything

```bash
podman-compose down
```

## What Works vs What's Stubbed

### ✅ Fully Working:

- Product browsing and search
- Mock supplier API with price deduplication
- User registration (basic)
- Health checks
- Resilience (timeouts, fallbacks)
- Redis caching
- Database queries
- Integration between services

### 📝 Stubbed/Mocked (For Demo):

- Auth0 login (needs real credentials)
- Email sending (logs to console)
- Payment processing (mock funds check)
- Actual supplier API calls (using mock data)
- Staff dispatch functions (endpoints exist but simplified)

## Common Issues

**Port already in use:**

```bash
podman-compose down  # Stop old containers first
```

**Container unhealthy:**

```bash
podman logs threeamigos-product-service-1  # Check logs
```

**Can't connect to services:**

```bash
# Make sure containers are running
podman ps

# Check if ports are accessible
curl http://localhost:3000/health
```

## Summary

The system demonstrates all the key assignment requirements:

- ✅ Microservices architecture
- ✅ Security (Auth0 integration, CORS, rate limiting)
- ✅ Resilience (timeouts, graceful degradation)
- ✅ Automated testing (Jest tests)
- ✅ DevOps (Docker, CI/CD ready)
- ✅ Mocked dependencies (supplier API)
- ✅ Configuration management (.env files)

**For the assignment demo, you can show the APIs working, the tests passing, and explain how Auth0 would work in production with real credentials.**
