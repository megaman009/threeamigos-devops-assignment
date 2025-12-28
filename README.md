# Three Amigos E-Commerce System

**Cloud Computing DevOps Assignment**

This is a microservices e-commerce platform I built for my DevOps assignment. It has products, users, and a frontend, all running in Docker containers.

## Assignment Scenario (ThAmCo)

- Company: ThreeAmigos Corp (ThAmCo).
- Scope (Stage 1): ~20% of the system focusing on Product Browsing/Search and User Auth/Profile.
- Stage 2 focus: security (Auth0 + JWT), automated tests (Jest + Supertest), resilience (timeouts + fallbacks), mocked dependencies (supplier API), and DevOps (Docker Compose + CI/CD).
- Stage 3: documentation and demo.
- See the original design docs in [DesignPlan](DesignPlan) and the implementation notes in [NARRATIVE_REPORT.md](NARRATIVE_REPORT.md).
  - Note: `DesignPlan/` is the Stage 1 deliverable (design). Stage 3 uses `NARRATIVE_REPORT.md`.

## What It Does

- **Product Service** (port 3000): Handles products with database and caching
- **User Service** (port 3001): Manages users
- **Frontend** (port 3002): React app that talks to the APIs
- **Database**: PostgreSQL for storing data
- **Cache**: Redis for faster performance

## Design Plan (Stage 1) Summary

- Goal: Show a simple microservices design for products and users.
- Tech: React (frontend), Node.js + Express (APIs), PostgreSQL, Redis, Auth0.
- Security: Use Auth0 and JWTs; protect user data.
- Resilience: Services are separate; supplier API is mocked.
- Diagrams: See design images in [DesignPlan/Architecture](DesignPlan/Architecture).
- More details: See [DesignPlan/readme.txt](DesignPlan/readme.txt) and [DesignPlan/Notes](DesignPlan/Notes).

## Scenario Coverage (What I Built)

This project implements about 20% of the full ThAmCo system, focused on products and users as required by the brief.

- Public features:

  - Browse products ✓
  - Search for products ✓
  - Register new account ✓ (basic version)

- Customer features:

  - Secure login with Auth0/JWT ✓
  - Update profile ✓ (basic version)
  - See product stock levels ✓ (updates every 5 minutes)
  - Check account funds ✓
  - Place orders ✓
  - View order history ✓
  - Get email notifications ✓ (logged to console)
  - Delete account ✓ (anonymizes data)

- Staff features:

  - See orders waiting for dispatch ✓
  - Mark orders as dispatched ✓
  - View customer funds and orders ✓
  - Delete customer accounts ✓

- Product system:
  - Get products from multiple suppliers ✓
  - Remove duplicate products ✓
  - Use cheapest price + 10% markup ✓
  - Update prices daily ✓ (and every 5 minutes for testing)

The main thing not implemented is the full frontend UI - right now you can test everything with curl commands or the integration script.

## How to Run Locally

### What You Need

- Docker
- Git

### Steps

1. Clone this repo:

   ```bash
   git clone https://github.com/megaman009/threeamigos-devops-assignment.git
   cd threeamigos-devops-assignment
   ```

2. Start everything:

   ```bash
   docker-compose up --build
   ```

3. Open in browser:
   - Frontend: http://localhost:3002
   - Product API: http://localhost:3000
   - User API: http://localhost:3001

## Azure Deployment

CI is set up for Azure deployment, but cloud deploy is pending secrets configuration. See `AZURE_DEPLOYMENT.md` if present; otherwise, deployment will be enabled once secrets are added.

4. **Verify services are running:**

   ```bash
   # Health checks
   curl http://localhost:3000/health
   curl http://localhost:3001/health

   # API endpoints
   curl http://localhost:3000/products
   curl http://localhost:3000/product-with-user
   # Search
   curl "http://localhost:3000/products/search?q=Coffee"
   # Funds (mock)
   curl "http://localhost:3001/funds?userId=101"
   # Create order
   curl -X POST http://localhost:3000/orders -H 'Content-Type: application/json' -d '{"userId":101, "productId":1, "quantity":1}'
   # Order history
   curl "http://localhost:3000/orders?userId=101"
   # Dispatch list
   curl http://localhost:3000/dispatches
   # Mark dispatched
   curl -X PATCH http://localhost:3000/orders/1/dispatch
   # User registration
   curl -X POST http://localhost:3001/users/register -H 'Content-Type: application/json' -d '{"email":"test@example.com","password":"pass123","name":"Test User"}'
   ```

### Troubleshooting

- Podman/Docker Compose network issue: If you see `network threeamigos_default was found but has incorrect label`, remove the stale network and retry:

  ```bash
  docker network rm threeamigos_default || true
  ```

  The `integration-test.sh` script also handles this cleanup automatically.

## Services

### Product Service

- Port: 3000
- What it does: Manages products, orders, and supplier data
- Main features: Product listing, search, ordering, dispatch, automatic price updates from suppliers

### User Service

- Port: 3001
- What it does: Manages users, authentication, and account operations
- Main features: User registration, profile updates, secure login with JWT, account deletion

### Frontend

- Port: 3002
- What it does: React app that shows the UI and calls the APIs

## Testing

Run tests with:

```bash
docker-compose exec product-service npm test
docker-compose exec user-service npm test
```

Tests check:

- Health endpoints work
- Products load from database
- Services can talk to each other
- APIs return correct data

## DevOps Stuff

- Everything runs in Docker containers
- Uses Docker Compose to manage multiple services
- Has automated tests that run in CI/CD
- Can deploy to Azure automatically
- Health checks and dependency management
- Environment-based configuration
- Production-ready containerization

### CI/CD Pipeline

- GitHub Actions CI/CD pipeline that runs tests automatically
- Security scanning to check for vulnerabilities
- Scripts to deploy and monitor the app

## Database

The app uses PostgreSQL with a products table:

```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Sample products: Coffee Beans ($12.99) and Espresso Machine ($299.99)

## APIs

### Product Service Endpoints

- `GET /health` - Health check
- `GET /products` - List all products (cached in Redis)
- `GET /products/search?q=coffee` - Search products
- `GET /product-with-user` - Example of calling another service
- `POST /orders` - Create a new order
- `GET /orders?userId=101` - Get order history
- `GET /dispatches` - List orders needing dispatch (for staff)
- `PATCH /orders/:id/dispatch` - Mark order as dispatched
- `GET /sync-supplier` - Manually trigger supplier sync

### User Service Endpoints

- `GET /health` - Health check
- `GET /user` - Get user info (needs JWT token)
- `POST /users/register` - Register new account
- `PATCH /users/:id` - Update profile (needs JWT token)
- `GET /funds?userId=101` - Check account funds
- `DELETE /users/:id` - Delete account (needs JWT token)

## Project Files

```
threeamigos-devops-assignment/
├── docker-compose.yml          # Runs everything locally
├── .github/workflows/ci-cd.yml # GitHub Actions CI/CD
├── product-service/            # Product API
├── user-service/              # User API
├── frontend/                  # React website
├── deploy.sh                  # Deploy script
└── health-check.sh           # Check if services are running
```

## What I Learned

This assignment helped me understand:

- **Microservices**: Breaking an app into smaller, independent services (product service and user service)
- **Docker**: Packaging each service in containers so they run anywhere
- **Testing**: Writing automated tests that run in CI/CD
- **Security**: Using Auth0 and JWTs to protect user data
- **Databases**: Using PostgreSQL for data and Redis for caching
- **Resilience**: Making services handle failures gracefully (like when another service is down)
- **DevOps**: Automating builds, tests, and deployments with GitHub Actions

The hardest part was getting all the services to talk to each other and making sure everything stayed secure.

---

Built with Node.js, React, PostgreSQL, Redis, Docker
For Cloud Computing DevOps Assignment
