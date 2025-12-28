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

This project implements about 20% of the full system, focused on products and basic security, matching the brief.

- Public (from brief):
   - Browse products: Done via `GET /products`.
   - Loose search: Planned in design, not implemented.
   - Register: Not implemented.

- Registered customers:
   - Secure sign-in: Backend uses Auth0/JWT guard; full login/profile UI not implemented.
   - Update profile: Not implemented.
   - See stock status: Basic stock shown in products; 5‑min auto updates not implemented.
   - See funds: Not implemented.
   - Order + emails + history + delete account: Not implemented.

- Staff:
   - Dispatch list + mark dispatched: Not implemented.
   - View customer profile/funds/orders: Not implemented.
   - Delete customer (erase/anonymise personal data): Not implemented.

- Product requirements:
   - Source suppliers list + de‑duplication + cheapest price +10%: Planned in design, not implemented.
   - Daily catalogue/price update: Mock supplier sync endpoint present; full scheduler not implemented.

See design intent in [DesignPlan](DesignPlan) and technology choices in [NARRATIVE_REPORT.md](NARRATIVE_REPORT.md).

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

I deployed this to Azure. Check `AZURE_DEPLOYMENT.md` for how I did it.

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
   ```

## Services

### Product Service

- Port: 3000
- What it does: Manages products, uses database and Redis cache
- Endpoints: `/health`, `/products`, `/product-with-user`

### User Service

- Port: 3001
- What it does: Handles users
- Endpoints: `/health`, `/user`

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

### Product Service

- GET `/health` - Check if service is running
- GET `/products` - Get all products
- GET `/product-with-user` - Get product info with user data

### User Service

- GET `/health` - Check if service is running
- GET `/user` - Get user information

#### GET /health

Returns service health status.

#### GET /products

Retrieves all products (with Redis caching).

#### GET /product-with-user

Demonstrates inter-service communication.

### User Service API

#### GET /health

Returns service health status.

#### GET /user

Retrieves user information.

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

This assignment covers:

- Microservices (separate services for different things)
- Docker containers (package apps with everything they need)
- Automated testing (tests run automatically)
- CI/CD (code gets tested and deployed automatically)
- Cloud deployment (runs on Azure)
- Databases and caching (PostgreSQL + Redis)

---

Built with Node.js, React, PostgreSQL, Redis, Docker
For Cloud Computing DevOps Assignment
