# ThAmCo E-Commerce Microservices System

A cloud-native, containerized e-commerce platform built with microservices architecture, demonstrating DevOps best practices for Cloud Computing assignments.

## 🏗️ Architecture Overview

This system implements a microservices-based e-commerce platform with the following components:

- **Product Service** (Port 3000): Manages product catalog with PostgreSQL persistence and Redis caching
- **User Service** (Port 3001): Handles user management and authentication
- **PostgreSQL**: Primary database for persistent data storage
- **Redis**: In-memory cache for performance optimization

## 🚀 Quick Start

### Prerequisites

- Docker/Podman
- Node.js 18+ (for local development)
- Git

### Running the System

1. **Clone and navigate to the project:**

   ```bash
   cd threeamigos
   ```

2. **Start all services:**

   ```bash
   docker-compose up --build
   ```

3. **Verify services are running:**

   ```bash
   # Product Service Health Check
   curl http://localhost:3000/health

   # User Service Health Check
   curl http://localhost:3001/health

   # Get Products (with caching)
   curl http://localhost:3000/products

   # Service-to-Service Communication
   curl http://localhost:3000/product-with-user
   ```

## 📋 Services

### Product Service (`/product-service`)

**Endpoints:**

- `GET /health` - Service health check
- `GET /products` - Retrieve all products (with Redis caching)
- `GET /product-with-user` - Demonstrate service-to-service communication

**Features:**

- PostgreSQL integration with automatic schema creation
- Redis caching (5-minute TTL)
- Comprehensive error handling
- Automated testing with Jest/Supertest

### User Service (`/user-service`)

**Endpoints:**

- `GET /health` - Service health check
- `GET /user` - Retrieve user information

**Features:**

- Lightweight user management
- Health monitoring
- Container-ready

## 🧪 Testing

### Automated Tests

```bash
# Run product service tests
cd product-service && npm test

# Run tests in container
docker-compose exec product-service npm test
```

**Test Coverage:**

- ✅ Health check endpoints
- ✅ Product retrieval with caching
- ✅ Database error handling
- ✅ Service-to-service communication
- ✅ API response validation

## 🐳 Containerization

### Docker Images

- `threeamigos_product-service:latest` - Node.js application with dependencies
- `threeamigos_user-service:latest` - Node.js application
- `postgres:15` - PostgreSQL database
- `redis:7-alpine` - Redis cache

### Environment Variables

```yaml
# Product Service
USER_SERVICE_URL=http://user-service:3001
DATABASE_URL=postgresql://postgres:password@postgres:5432/thamco
REDIS_URL=redis://redis:6379

# User Service
DATABASE_URL=postgresql://postgres:password@postgres:5432/thamco
```

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

## 🔧 Development

### Local Development Setup

```bash
# Install dependencies for each service
cd product-service && npm install
cd ../user-service && npm install

# Run services locally (requires PostgreSQL and Redis running)
cd product-service && npm start
cd user-service && npm start
```

### Adding New Features

1. Update service code
2. Add tests in `*.test.js`
3. Update Docker configuration if needed
4. Test with `docker-compose up --build`

## 📊 Monitoring & Health Checks

All services include health check endpoints and Docker health checks:

- HTTP-based health checks every 10 seconds
- 3-second timeout with 3 retries
- Automatic service dependency management

## 🏭 DevOps Features

- ✅ **Containerization**: Full Docker/Podman support
- ✅ **Orchestration**: Docker Compose for multi-service management
- ✅ **Automated Testing**: Jest test suite with 6 passing tests
- ✅ **Health Monitoring**: Built-in health checks
- ✅ **Environment Configuration**: Environment-based settings
- ✅ **Error Handling**: Comprehensive error management
- ✅ **Caching**: Redis integration for performance
- ✅ **Database Integration**: PostgreSQL with connection pooling

## 🚀 Deployment

### Production Considerations

- Environment-specific configurations
- Database migrations
- Load balancing
- Monitoring and logging
- Security hardening

### Scaling

```bash
# Scale services
docker-compose up --scale product-service=3

# Update services
docker-compose up --build --force-recreate
```

## 📚 API Documentation

### Product Service API

#### GET /health

Returns service health status.

**Response:**

```json
{
  "status": "Product Service is healthy"
}
```

#### GET /products

Retrieves all products with caching.

**Response:**

```json
[
  {
    "id": 1,
    "name": "Coffee Beans",
    "stock": 42,
    "price": 12.99
  }
]
```

#### GET /product-with-user

Demonstrates service-to-service communication.

**Response:**

```json
{
  "product": {
    "id": 1,
    "name": "Coffee Beans",
    "stock": 42,
    "price": 12.99
  },
  "user": {
    "id": 101,
    "name": "Test User",
    "role": "customer"
  }
}
```

## 🚀 Production Deployment

### Prerequisites

- Docker and Docker Compose
- Environment variables configured (see `.env.example`)

### Production Setup

1. **Configure environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your production values
   ```

2. **Deploy to production:**

   ```bash
   ./deploy.sh
   ```

   This script will:

   - Build production Docker images
   - Run automated tests
   - Perform security scanning (if Trivy is installed)
   - Start services with production configuration

3. **Monitor deployment:**

   ```bash
   ./health-check.sh
   ```

### Production Features

- **Load Balancing & Reverse Proxy**: Nginx with SSL termination
- **Health Checks**: Automated service monitoring
- **Rate Limiting**: API protection against abuse
- **Security Headers**: OWASP recommended headers
- **Gzip Compression**: Optimized content delivery
- **Persistent Storage**: Named volumes for data persistence

### Production URLs

- **Frontend**: https://your-domain.com
- **Product API**: https://your-domain.com/api/products
- **User API**: https://your-domain.com/api/users
- **Health Check**: https://your-domain.com/health

### SSL Configuration

For SSL support, place your certificates in `nginx/ssl/`:

- `cert.pem` - SSL certificate
- `key.pem` - Private key

Then run with SSL profile:

```bash
docker-compose -f docker-compose.prod.yml --profile production-with-ssl up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is created for educational purposes as part of a Cloud Computing DevOps assignment.

---

**Built with:** Node.js, Express, PostgreSQL, Redis, Docker, Jest
**Architecture:** Microservices, Containerized, Cloud-Native</content>
<parameter name="filePath">/home/megaman/Desktop/CloudComputingDevOpsAssignment/threeamigos/README.md
