#!/bin/bash
# ==============================================================================
# mkv2castUI Deployment Script
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== mkv2castUI Deployment Script ===${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# Use docker compose (v2) if available, otherwise docker-compose (v1)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found${NC}"
    if [ -f .env.example ]; then
        echo "Creating .env from .env.example..."
        cp .env.example .env
        echo -e "${YELLOW}Please edit .env and configure your settings before continuing${NC}"
        echo "Press Enter to continue after editing .env, or Ctrl+C to cancel..."
        read
    else
        echo -e "${RED}Error: .env.example not found${NC}"
        exit 1
    fi
fi

# Validate required environment variables
echo -e "${GREEN}Validating configuration...${NC}"
source .env

if [ -z "$DJANGO_SECRET_KEY" ] || [ "$DJANGO_SECRET_KEY" = "your-secret-key-here-change-this" ]; then
    echo -e "${RED}Error: DJANGO_SECRET_KEY is not set or is using default value${NC}"
    echo "Please set a secure secret key in .env"
    exit 1
fi

if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "change-this-password" ]; then
    echo -e "${RED}Error: POSTGRES_PASSWORD is not set or is using default value${NC}"
    echo "Please set a secure password in .env"
    exit 1
fi

if [ "$REQUIRE_AUTH" = "true" ] && [ -z "$NEXTAUTH_SECRET" ]; then
    echo -e "${YELLOW}Warning: NEXTAUTH_SECRET is not set (required if REQUIRE_AUTH=true)${NC}"
fi

echo -e "${GREEN}Configuration validated!${NC}"
echo ""

# Pull latest images
echo -e "${GREEN}Pulling latest images...${NC}"
$DOCKER_COMPOSE pull

# Start services
echo -e "${GREEN}Starting services...${NC}"
$DOCKER_COMPOSE up -d

# Wait for services to be ready
echo -e "${GREEN}Waiting for services to be ready...${NC}"
sleep 10

# Check service status
echo -e "${GREEN}Checking service status...${NC}"
$DOCKER_COMPOSE ps

echo ""
echo -e "${GREEN}=== Deployment Complete! ===${NC}"
echo ""
echo "Services are starting up. You can:"
echo "  - View logs: $DOCKER_COMPOSE logs -f"
echo "  - Check status: $DOCKER_COMPOSE ps"
echo "  - Stop services: $DOCKER_COMPOSE down"
echo ""
echo "Once services are ready, access the application at:"
echo -e "${GREEN}http://localhost:${NGINX_PORT:-8080}${NC}"
echo ""
echo "To create an admin user, run:"
echo "  $DOCKER_COMPOSE exec backend python manage.py createadminuser \\"
echo "    --username admin --email admin@example.com --password 'YourPassword'"
echo ""
