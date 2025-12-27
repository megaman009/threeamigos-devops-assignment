# Three Amigos E-Commerce System

**Cloud Computing DevOps Assignment**

This is a microservices e-commerce platform I built for my DevOps assignment. It has products, users, and a frontend, all running in Docker containers.

## What It Does

- **Product Service** (port 3000): Handles products with database and caching
- **User Service** (port 3001): Manages users
- **Frontend** (port 3002): React app that talks to the APIs
- **Database**: PostgreSQL for storing data
- **Cache**: Redis for faster performance

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

I deployed this to Azure using my student account ($100 credit). Check `AZURE_DEPLOYMENT.md` for how I did it.

4. **Verify services are running:**

   ```bash
   # Health checks
   curl http://localhost:3000/health
   curl http://localhost:3001/health

   # API endpoints
   curl http://localhost:3000/products
   curl http://localhost:3000/product-with-user
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
For Cloud Computing DevOps class
