#!/bin/bash
# ==============================================================================
# mkv2castUI Update Script
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== mkv2castUI Update Script ===${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Use docker compose (v2) if available, otherwise docker-compose (v1)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# Check if services are running
if ! $DOCKER_COMPOSE ps | grep -q "Up"; then
    echo -e "${YELLOW}Warning: Services don't appear to be running${NC}"
    echo "Starting services..."
    $DOCKER_COMPOSE up -d
    exit 0
fi

# Backup database (optional but recommended)
echo -e "${GREEN}Creating database backup...${NC}"
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
$DOCKER_COMPOSE exec -T postgres pg_dump -U mkv2cast mkv2cast > "$BACKUP_FILE" 2>/dev/null || echo -e "${YELLOW}Warning: Could not create backup${NC}"

if [ -f "$BACKUP_FILE" ]; then
    echo -e "${GREEN}Backup created: $BACKUP_FILE${NC}"
fi

# Pull latest images
echo -e "${GREEN}Pulling latest images...${NC}"
$DOCKER_COMPOSE pull

# Stop services
echo -e "${GREEN}Stopping services...${NC}"
$DOCKER_COMPOSE down

# Start services (migrations will run automatically)
echo -e "${GREEN}Starting services with new images...${NC}"
$DOCKER_COMPOSE up -d

# Wait for services to be ready
echo -e "${GREEN}Waiting for services to be ready...${NC}"
sleep 10

# Check service status
echo -e "${GREEN}Checking service status...${NC}"
$DOCKER_COMPOSE ps

echo ""
echo -e "${GREEN}=== Update Complete! ===${NC}"
echo ""
echo "Services have been updated. Check logs if you encounter any issues:"
echo "  $DOCKER_COMPOSE logs -f"
echo ""
