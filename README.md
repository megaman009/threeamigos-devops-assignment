# ThAmCo E-Commerce Microservices System

**Cloud Computing DevOps Assignment - Complete Microservices Platform**

A containerized e-commerce platform demonstrating DevOps best practices including microservices architecture, automated testing, CI/CD pipelines, and production deployment.

## 🏗️ Architecture Overview

This system implements a microservices-based e-commerce platform with:

- **Product Service** (Port 3000): Manages product catalog with PostgreSQL persistence and Redis caching
- **User Service** (Port 3001): Handles user management and authentication
- **React Frontend** (Port 3002): User interface consuming microservices APIs
- **PostgreSQL**: Primary database for persistent data storage
- **Redis**: In-memory cache for performance optimization

## 🚀 Quick Start

### Prerequisites

- Docker/Podman
- Node.js 18+ (for local development)
- Git

### Running the System

1. **Clone the repository:**

   ```bash
   git clone https://github.com/megaman009/threeamigos-devops-assignment.git
   cd threeamigos-devops-assignment
   ```

2. **Start all services:**

   ```bash
   docker-compose up --build
   ```

3. **Access the application:**

   - **Frontend**: http://localhost:3002
   - **Product API**: http://localhost:3000
   - **User API**: http://localhost:3001

   **🚀 Azure Cloud Deployment Available!**
   See `AZURE_DEPLOYMENT.md` for professional cloud hosting instructions.

   **🆓 FREE Deployment Options Available!**
   See `FREE_DEPLOYMENT.md` for zero-cost hosting alternatives.

4. **Verify services are running:**

   ```bash
   # Health checks
   curl http://localhost:3000/health
   curl http://localhost:3001/health

   # API endpoints
   curl http://localhost:3000/products
   curl http://localhost:3000/product-with-user
   ```

## 📋 Services

### Product Service (`/product-service`)

- **Port**: 3000
- **Features**: Product catalog management, Redis caching, PostgreSQL integration
- **Endpoints**: `/health`, `/products`, `/product-with-user`

### User Service (`/user-service`)

- **Port**: 3001
- **Features**: User management and authentication
- **Endpoints**: `/health`, `/user`

### React Frontend (`/frontend`)

- **Port**: 3002
- **Features**: Modern React UI consuming microservices APIs
- **Components**: Product display, user information, API integration

## 🧪 Testing

### Automated Tests

```bash
# Run all service tests
docker-compose exec product-service npm test
docker-compose exec user-service npm test

# Or run locally
cd product-service && npm test
cd user-service && npm test
```

**Test Coverage:**

- ✅ Health check endpoints
- ✅ Product retrieval with caching
- ✅ Database connectivity
- ✅ Service-to-service communication
- ✅ API response validation

## 🐳 Containerization & DevOps

### Docker Services

- Multi-service orchestration with Docker Compose
- Health checks and dependency management
- Environment-based configuration
- Production-ready containerization

### CI/CD Pipeline

- **GitHub Actions** automated pipeline (`.github/workflows/ci-cd.yml`)
- Automated testing on every push
- Security scanning with Trivy
- Docker image building and verification
- Deployment automation scripts

### Production Deployment

```bash
# Production deployment
./deploy.sh

# Health monitoring
./health-check.sh
```

## 📊 DevOps Features Demonstrated

- ✅ **Microservices Architecture**: Independent, scalable services
- ✅ **Container Orchestration**: Docker Compose multi-service management
- ✅ **Automated Testing**: Jest test suite with comprehensive coverage
- ✅ **CI/CD Pipeline**: GitHub Actions with automated workflows
- ✅ **Security Scanning**: Container vulnerability assessment
- ✅ **Health Monitoring**: Built-in service health checks
- ✅ **Database Integration**: PostgreSQL with connection management
- ✅ **Caching Strategy**: Redis for performance optimization
- ✅ **API Design**: RESTful endpoints with proper error handling
- ✅ **Frontend-Backend Integration**: React consuming microservices

## 🗄️ Database Schema

### Products Table

```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Sample Data:**

- Coffee Beans (42 units, $12.99)
- Espresso Machine (5 units, $299.99)

## 📚 API Documentation

### Product Service API

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

## 🔧 Development

### Local Development Setup

```bash
# Install dependencies
cd product-service && npm install
cd ../user-service && npm install
cd ../frontend && npm install

# Run services (requires local PostgreSQL/Redis)
npm start  # in each service directory
```

### Project Structure

```
threeamigos-devops-assignment/
├── docker-compose.yml          # Development environment
├── docker-compose.prod.yml     # Production configuration
├── .github/workflows/ci-cd.yml # CI/CD pipeline
├── product-service/            # Product microservice
├── user-service/              # User microservice
├── frontend/                  # React frontend
├── nginx/                     # Production reverse proxy
├── deploy.sh                  # Deployment automation
└── health-check.sh           # Monitoring script
```

## 📄 Assignment Requirements Met

This project demonstrates all key DevOps concepts:

- **Microservices**: Independent services with clear boundaries
- **Containerization**: Full Docker implementation
- **Orchestration**: Multi-service management
- **Testing**: Automated test suites
- **CI/CD**: GitHub Actions pipeline
- **Monitoring**: Health checks and logging
- **Security**: Container scanning and best practices
- **Documentation**: Comprehensive setup and API docs
- **Version Control**: Git with proper commit history
- **Production Ready**: Deployment scripts and configuration

---

**Built for:** Cloud Computing DevOps Assignment
**Technologies:** Node.js, Express, React, PostgreSQL, Redis, Docker, Jest, GitHub Actions
**Architecture:** Microservices, Containerized, Cloud-Native
