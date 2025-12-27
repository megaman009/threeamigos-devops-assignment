#!/bin/bash

# Three Amigos - Production Deployment Script
# This script handles the complete production deployment of the microservices platform

set -e

echo "🚀 Starting Three Amigos Production Deployment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found! Please copy .env.example to .env and configure your environment variables."
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

print_status "Environment variables loaded"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_status "Docker is running"

# Build the services
print_status "Building Docker images..."
docker-compose -f docker-compose.yml build

print_success "Docker images built successfully"

# Run tests before deployment
print_status "Running tests..."
if docker-compose -f docker-compose.yml run --rm product-service npm test && \
   docker-compose -f docker-compose.yml run --rm user-service npm test; then
    print_success "All tests passed"
else
    print_error "Tests failed! Aborting deployment."
    exit 1
fi

# Build production images
print_status "Building production images..."
docker build -t thamco-product-service:latest ./product-service
docker build -t thamco-user-service:latest ./user-service
docker build -t thamco-frontend:latest ./frontend

print_success "Production images built"

# Run security scan
print_status "Running security scan with Trivy..."
if command -v trivy &> /dev/null; then
    trivy image --exit-code 0 --no-progress thamco-product-service:latest || true
    trivy image --exit-code 0 --no-progress thamco-user-service:latest || true
    trivy image --exit-code 0 --no-progress thamco-frontend:latest || true
    print_success "Security scan completed"
else
    print_warning "Trivy not found. Skipping security scan."
fi

# Deploy to production
print_status "Starting production deployment..."
docker-compose -f docker-compose.prod.yml up -d

print_success "Production deployment started"

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 30

# Check service health
if curl -f http://localhost/health > /dev/null 2>&1; then
    print_success "All services are healthy!"
else
    print_warning "Services may still be starting. Check logs with: docker-compose -f docker-compose.prod.yml logs"
fi

print_success "🎉 Deployment completed successfully!"
echo ""
echo "Services available at:"
echo "  - Frontend: http://localhost"
echo "  - Product API: http://localhost/api/products"
echo "  - User API: http://localhost/api/users"
echo ""
echo "To view logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "To stop: docker-compose -f docker-compose.prod.yml down"