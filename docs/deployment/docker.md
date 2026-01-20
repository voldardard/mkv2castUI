# Docker Deployment

This guide covers deploying mkv2castUI with Docker Compose for production use, including all build options, Docker commands, and configuration details.

## Prerequisites

- Docker 20.10+
- Docker Compose v2+
- Domain name (for HTTPS)
- SSL certificate (Let's Encrypt recommended)

## Production Configuration

### 1. Clone and Configure

```bash
git clone https://github.com/voldardard/mkv2castUI.git
cd mkv2castUI
cp .env.example .env
```

### 2. Generate Secrets

```bash
# Generate Django secret key
python -c "import secrets; print(secrets.token_urlsafe(50))"

# Generate NextAuth secret
openssl rand -base64 32

# Generate strong database password
openssl rand -base64 24
```

### 3. Configure Environment

Edit `.env` with production values:

```bash
# Application
REQUIRE_AUTH=true

# Django
DJANGO_SECRET_KEY=your-generated-secret-key
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=your-domain.com,www.your-domain.com

# Database
POSTGRES_DB=mkv2cast
POSTGRES_USER=mkv2cast
POSTGRES_PASSWORD=your-strong-database-password
DATABASE_URL=postgres://mkv2cast:your-strong-database-password@postgres:5432/mkv2cast

# Redis
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Frontend
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-generated-nextauth-secret

# OAuth (configure at least one)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# mkv2cast
MKV2CAST_DEFAULT_HW=auto
MKV2CAST_DEFAULT_CRF=20
MKV2CAST_MAX_FILE_SIZE=21474836480  # 20GB

# Workers
GUNICORN_WORKERS=8
CELERY_WORKER_CONCURRENCY=4
```

## Docker Compose for Production

### docker-compose.prod.yml

```yaml
version: '3.8'

services:
  nginx:
    build: ./nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - static_files:/app/static:ro
      - media_files:/app/media:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - frontend
      - backend
      - daphne
    restart: always
    networks:
      - mkv2cast-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=/api
      - NEXT_PUBLIC_WS_URL=/ws
      - NEXT_PUBLIC_REQUIRE_AUTH=${REQUIRE_AUTH}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
      - GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
    restart: always
    networks:
      - mkv2cast-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    command: >
      sh -c "python manage.py migrate &&
             python manage.py collectstatic --noinput &&
             gunicorn mkv2cast_api.wsgi:application 
               --bind 0.0.0.0:8000 
               --workers ${GUNICORN_WORKERS:-4} 
               --timeout ${GUNICORN_TIMEOUT:-120}
               --access-logfile -
               --error-logfile -"
    environment:
      - REQUIRE_AUTH=${REQUIRE_AUTH}
      - DJANGO_SECRET_KEY=${DJANGO_SECRET_KEY}
      - DJANGO_DEBUG=False
      - DJANGO_ALLOWED_HOSTS=${DJANGO_ALLOWED_HOSTS}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - CELERY_BROKER_URL=${CELERY_BROKER_URL}
    volumes:
      - static_files:/app/static
      - media_files:/app/media
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: always
    networks:
      - mkv2cast-network

  daphne:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    command: daphne -b 0.0.0.0 -p 8001 mkv2cast_api.asgi:application
    environment:
      - REQUIRE_AUTH=${REQUIRE_AUTH}
      - DJANGO_SECRET_KEY=${DJANGO_SECRET_KEY}
      - DJANGO_DEBUG=False
      - DJANGO_ALLOWED_HOSTS=${DJANGO_ALLOWED_HOSTS}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    volumes:
      - media_files:/app/media
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: always
    networks:
      - mkv2cast-network

  celery:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    command: celery -A mkv2cast_api worker -l info --concurrency=${CELERY_WORKER_CONCURRENCY:-4}
    environment:
      - REQUIRE_AUTH=${REQUIRE_AUTH}
      - DJANGO_SECRET_KEY=${DJANGO_SECRET_KEY}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - CELERY_BROKER_URL=${CELERY_BROKER_URL}
      - CELERY_RESULT_BACKEND=${CELERY_RESULT_BACKEND}
      - MKV2CAST_DEFAULT_HW=${MKV2CAST_DEFAULT_HW}
      - MKV2CAST_VAAPI_DEVICE=${MKV2CAST_VAAPI_DEVICE}
      - MKV2CAST_DEFAULT_CRF=${MKV2CAST_DEFAULT_CRF}
      - MKV2CAST_DEFAULT_PRESET=${MKV2CAST_DEFAULT_PRESET}
      - MKV2CAST_DEFAULT_AUDIO_BITRATE=${MKV2CAST_DEFAULT_AUDIO_BITRATE}
      - MKV2CAST_MAX_FILE_SIZE=${MKV2CAST_MAX_FILE_SIZE}
    volumes:
      - media_files:/app/media
    devices:
      - /dev/dri:/dev/dri
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: always
    networks:
      - mkv2cast-network

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always
    networks:
      - mkv2cast-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: always
    networks:
      - mkv2cast-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
  static_files:
  media_files:

networks:
  mkv2cast-network:
    driver: bridge
```

## SSL Configuration

### Using Let's Encrypt with Certbot

```bash
# Install certbot
apt-get install certbot python3-certbot-nginx

# Obtain certificate
certbot certonly --standalone -d your-domain.com

# Certificates will be at:
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem
```

### Nginx SSL Configuration

Create `nginx/nginx.prod.conf`:

```nginx
upstream frontend {
    server frontend:3000;
}

upstream backend {
    server backend:8000;
}

upstream websocket {
    server daphne:8001;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    client_max_body_size 20G;

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
    }

    location /ws/ {
        proxy_pass http://websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    location /static/ {
        alias /app/static/;
        expires 30d;
    }

    location /media/ {
        alias /app/media/;
        expires 7d;
    }
}
```

## Docker Compose Files

### docker-compose.yml (Development)

Development configuration with local builds:

```bash
# Build all images from source
docker-compose build

# Build specific service
docker-compose build backend
docker-compose build frontend
docker-compose build nginx

# Build without cache
docker-compose build --no-cache

# Build with specific build args
docker-compose build --build-arg NODE_ENV=production frontend
```

**Services:**
- All services built from local Dockerfiles
- Hot-reload support for development
- MinIO included for local S3-compatible storage
- Volume mounts for development

### docker-compose.prod.yml (Production)

Production configuration using pre-built images from GitHub Container Registry:

```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Pull specific service
docker-compose -f docker-compose.prod.yml pull backend

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

**Services:**
- Uses pre-built images from `ghcr.io/voldardard/mkv2castui-*`
- Optimized for production
- Automatic migrations on startup
- No MinIO (use external S3)

## Docker Build Options

### Backend Dockerfile

**Base Image:** `python:3.12-slim`

**System Dependencies:**
- FFmpeg (video processing)
- PostgreSQL client libraries (`libpq-dev`)
- VAAPI drivers (Intel/AMD GPU support)
- Pillow dependencies (image processing)
- Build tools (`gcc`, `git`)

**Build Arguments:**
- None (uses Python 3.12-slim base image)

**Environment Variables (build-time):**
- `PYTHONDONTWRITEBYTECODE=1`
- `PYTHONUNBUFFERED=1`
- `PYTHONPATH=/app`
- `DJANGO_SETTINGS_MODULE=mkv2cast_api.settings`

**Example:**
```bash
cd backend
docker build -t mkv2castui-backend:latest .
docker build --no-cache -t mkv2castui-backend:dev .
```

### Frontend Dockerfile

**Multi-stage Build:**
1. **Builder stage** (`node:20-alpine`): Installs dependencies and builds Next.js app
2. **Runner stage** (`node:20-alpine`): Minimal production image with only built files

**Build Arguments:**
- None (uses Node 20-alpine base image)

**Environment Variables (build-time):**
- `NEXT_TELEMETRY_DISABLED=1`
- `NODE_ENV=production` (runner stage)

**Example:**
```bash
cd frontend
docker build -t mkv2castui-frontend:latest .
docker build --target builder -t mkv2castui-frontend:builder .
```

### Nginx Dockerfile

**Base Image:** `nginx:alpine`

**Configuration:**
- Custom `nginx.conf` for routing
- Static file serving
- WebSocket proxy support
- Large file upload support (10GB default)

**Example:**
```bash
cd nginx
docker build -t mkv2castui-nginx:latest .
```

## Docker Compose Commands

### Service Management

```bash
# Start all services
docker-compose up -d
# or using Makefile
make up

# Stop all services
docker-compose down
# or using Makefile
make down

# Restart specific service
docker-compose restart backend

# Stop and remove volumes
docker-compose down -v

# View service status
docker-compose ps

# View resource usage
docker stats
```

### Logs

```bash
# All services
docker-compose logs -f
# or using Makefile
make logs

# Specific service
docker-compose logs -f backend
docker-compose logs -f celery
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100 backend

# Since timestamp
docker-compose logs --since 2024-01-01T00:00:00 backend
```

### Executing Commands

```bash
# Django management commands
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
docker-compose exec backend python manage.py createadminuser \
  --username admin --email admin@example.com --password 'pass'

# Shell access
docker-compose exec backend bash
docker-compose exec frontend sh
docker-compose exec postgres psql -U mkv2cast

# Check VAAPI
docker-compose exec celery vainfo

# Check Redis
docker-compose exec redis redis-cli ping
```

### Scaling Services

```bash
# Scale Celery workers
docker-compose up -d --scale celery=4

# Scale backend (requires load balancer)
docker-compose up -d --scale backend=3
```

### Volumes

```bash
# List volumes
docker volume ls | grep mkv2cast

# Inspect volume
docker volume inspect mkv2castui_postgres_data

# Backup volume
docker run --rm \
  -v mkv2castui_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_backup.tar.gz /data

# Remove unused volumes
docker volume prune
```

### Networks

```bash
# Inspect network
docker network inspect mkv2castui_mkv2cast-network

# Connect external container
docker network connect mkv2castui_mkv2cast-network my-container
```

## Hardware Acceleration Setup

### VAAPI (Intel/AMD GPU)

```bash
# Check device on host
ls -la /dev/dri/

# Device is automatically mounted in docker-compose.yml
# Verify in container
docker-compose exec celery vainfo
```

### NVIDIA NVENC

Requires `nvidia-docker2` and runtime configuration:

```yaml
# Add to docker-compose.yml celery service
runtime: nvidia
environment:
  - NVIDIA_VISIBLE_DEVICES=all
```

```bash
# Install nvidia-docker2
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update && sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker
```

## Deployment

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build
# or using Makefile
make build-prod

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Run migrations (automatic on startup, but can be run manually)
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate
```

## Monitoring

### Health Checks

```bash
# Check all services
docker-compose -f docker-compose.prod.yml ps

# Check specific service
docker-compose -f docker-compose.prod.yml logs backend --tail=100
```

### Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df
```

## Backup

### Database Backup

```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U mkv2cast mkv2cast > backup_$(date +%Y%m%d).sql

# Restore backup
cat backup.sql | docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U mkv2cast mkv2cast
```

### Media Files Backup

```bash
# Backup media volume
docker run --rm -v mkv2castui_media_files:/data -v $(pwd):/backup \
  alpine tar czf /backup/media_backup.tar.gz /data
```

## Scaling

### Horizontal Scaling

Scale Celery workers for more conversion throughput:

```bash
docker-compose -f docker-compose.prod.yml up -d --scale celery=4
```

### Load Balancing

For high availability, deploy behind a load balancer (HAProxy, Traefik, or cloud LB).
