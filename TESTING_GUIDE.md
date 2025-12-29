# Testing Guide

**Quick guide to test everything works**

## Start Everything

```bash
docker-compose up -d
sleep 10
docker ps
```

Should see 5 containers running.

## Test APIs

```bash
# Get products
curl http://localhost:3000/products

# Search
curl "http://localhost:3000/products/search?q=coffee"

# Health checks
curl http://localhost:3000/health
curl http://localhost:3001/health
```

## Test Frontend

Open http://localhost:3002

- Browse products ✓
- Search ✓
- Add to cart ✓
- Login with Auth0 ✓
- Place order ✓

## Run Automated Tests

```bash
# Unit tests
npm test --prefix product-service
npm test --prefix user-service

# Integration test
./integration-test.sh
```

**Expected:** 25 tests pass (13 product + 12 user)

## What Works

**Without login:**
- Browse products
- Search
- See stock levels

**With Auth0 login:**
- View profile
- Place orders
- Check funds

## Quick Checks

```bash
# Test resilience (should return fallback if user service down)
curl http://localhost:3000/product-with-user

# Test caching (Redis)
docker exec threeamigos_redis_1 redis-cli KEYS "*"

# Check logs
docker logs threeamigos_product-service_1
```

That's it! If all tests pass and frontend works, you're good.
