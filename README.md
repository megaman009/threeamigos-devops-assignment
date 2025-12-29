# ThAmCo E-Commerce Platform

**Student:** Ali Mustafa (2110097)  
**Module:** Cloud Computing & DevOps (CIS3032-N)

E-commerce system for ThreeAmigos Corporation (ThAmCo) - a startup that resells products online.

## Live Demo (Azure)

- Frontend: https://frontend.happydune-2f7f3502.uaenorth.azurecontainerapps.io
- Product API: https://product-service.happydune-2f7f3502.uaenorth.azurecontainerapps.io
- User API: https://user-service.happydune-2f7f3502.uaenorth.azurecontainerapps.io

Azure deployment notes and scripts: [AZURE_DEPLOYMENT.md](AZURE_DEPLOYMENT.md)

## What It Does

- Browse and search products
- Shopping cart with stock limits
- Secure Auth0 login
- Place orders
- All running in Docker containers

## Running It

```bash
git clone https://github.com/megaman009/threeamigos-devops-assignment.git
cd threeamigos-devops-assignment
docker-compose up --build
```

Open http://localhost:3002

## Services

- **Product Service** (3000): Products, orders, search, PostgreSQL + Redis
- **User Service** (3001): Auth0 login, user profiles
- **Frontend** (3002): React shopping interface

## Tech Stack

- Node.js/Express, React, PostgreSQL, Redis
- Auth0 authentication
- Docker containers
- GitHub Actions CI/CD

## CI/CD Pipeline

GitHub Actions runs three jobs in the CI/CD workflow:

- `test`: installs dependencies, runs unit tests, builds the frontend, builds Docker images
- `security-scan`: Trivy scan + SARIF upload to GitHub Security
- `deploy` (optional): deploys to Azure Container Apps when GitHub secrets are configured

## Tests

```bash
npm test --prefix product-service
npm test --prefix user-service
```

25 tests total - all should pass.

## What I Built for ThAmCo

**Features:**

- Product browsing and search
- Shopping cart (respects stock limits)
- Secure checkout with Auth0
- Orders saved to database
- Redis caching for speed

**What's not built** (out of scope):

- Payment processing
- Admin dashboard
- Email notifications

This implements ~20% of a full system to demonstrate microservices and DevOps concepts.

## Security

- Auth0 OAuth2
- JWT tokens
- Helmet.js headers
- CORS protection
- Rate limiting

---

_Assignment for Cloud Computing & DevOps module, demonstrating microservices architecture, containerization, and secure authentication._
