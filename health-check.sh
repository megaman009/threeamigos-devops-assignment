#!/bin/bash

# Three Amigos - Health Check Script
# Monitors the health of all services in the production deployment

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

echo "🔍 Three Amigos Health Check"
echo "============================"

# Check if services are running
echo ""
print_status "Checking Docker containers..."
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    print_success "Docker containers are running"
    docker-compose -f docker-compose.prod.yml ps
else
    print_error "No containers are running"
    exit 1
fi

# Check service endpoints
echo ""
print_status "Checking service endpoints..."

# Frontend
if curl -s -f http://localhost > /dev/null 2>&1; then
    print_success "Frontend is healthy"
else
    print_error "Frontend is not responding"
fi

# Product Service
if curl -s -f http://localhost/api/products/health > /dev/null 2>&1; then
    print_success "Product Service is healthy"
else
    print_warning "Product Service health check failed"
fi

# User Service
if curl -s -f http://localhost/api/users/health > /dev/null 2>&1; then
    print_success "User Service is healthy"
else
    print_warning "User Service health check failed"
fi

# Check database connectivity
echo ""
print_status "Checking database connectivity..."
if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U thamco_user -d thamco > /dev/null 2>&1; then
    print_success "PostgreSQL is healthy"
else
    print_error "PostgreSQL is not responding"
fi

# Check Redis connectivity
if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping | grep -q "PONG"; then
    print_success "Redis is healthy"
else
    print_error "Redis is not responding"
fi

# Check resource usage
echo ""
print_status "Checking resource usage..."
echo "Container Resource Usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Check logs for errors
echo ""
print_status "Checking recent logs for errors..."
echo "Recent errors (last 10 lines):"
docker-compose -f docker-compose.prod.yml logs --tail=10 2>&1 | grep -i error || echo "No recent errors found"

echo ""
print_success "Health check completed!"