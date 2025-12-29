# Stage 2 - What I Built

**Student:** Ali Mustafa (2110097)

This is what I implemented for Stage 2 of the assignment.

## What's Included (~20% of Full System)

I focused on:
- Product browsing and search
- User authentication (Auth0)
- Shopping cart with stock limits
- Basic ordering
- Microservices architecture

## 1. Automated Testing ✓

**Unit Tests:**
- 13 tests for Product Service
- 12 tests for User Service
- All passing

**CI/CD:**
- GitHub Actions runs tests automatically on every push
- Trivy security scanning

```bash
npm test --prefix product-service
npm test --prefix user-service
```

## 2. Configuration Management ✓

Environment files for different stages:
- `.env.development` - local Docker
- `.env.test` - automated tests
- `.env.production` - Azure deployment

Same code, different configs = no changes needed when deploying.

## 3. Security ✓

- **Auth0 OAuth2** - no password storage, industry standard
- **JWT tokens** - secure API access
- **Helmet** - security headers
- **CORS** - only my frontend can call APIs
- **Rate limiting** - 100 requests per 15 minutes

## 4. Resilience ✓

System handles failures gracefully:

- **Timeouts** - 5 second limit on service calls
- **Fallback data** - if User Service is down, Product Service still works
- **Health checks** - `/health` endpoints for monitoring
- **Graceful shutdown** - closes connections properly

Example:
```javascript
try {
  const response = await fetch(userService, { timeout: 5000 });
} catch (error) {
  user = { name: "Unavailable (fallback)" }; // Keep working!
}
```

## 5. Mock Interfaces ✓

- **Supplier API** - simulates external suppliers with different prices
- **Email service** - logs order notifications
- **User funds** - mock account balance

## 6. DevOps Workflow ✓

- Git version control
- GitHub Actions CI/CD pipeline
- Automated testing and security scanning
- Docker containerization
- Ready for Azure deployment

## What Works

✅ Browse products without login
✅ Search products
✅ Auth0 login
✅ Shopping cart (respects stock)
✅ Place orders
✅ Services recover from failures
✅ All tests pass
✅ Security headers and rate limiting

## Out of Scope

❌ Payment processing
❌ Admin dashboard
❌ Email notifications (just logged)
❌ Full inventory management

This demonstrates microservices, DevOps practices, and cloud-ready architecture for the assignment.
