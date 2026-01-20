# Deployment Bundle

This guide explains how to use the standalone deployment bundle for mkv2castUI.

## Overview

The deployment bundle is a self-contained package that includes everything needed to deploy mkv2castUI without cloning the entire repository. It's perfect for:
- Quick deployments
- Offline installations
- Production environments
- Users who prefer minimal downloads

## Bundle Contents

The deployment bundle includes:
- `docker-compose.yml` - Docker Compose configuration
- `env.example` - Environment variables template
- `deploy.sh` - Automated deployment script
- `update.sh` - Update script
- `README.md` - Quick start guide

## Downloading the Bundle

### Option 1: From GitHub Releases

```bash
# Download latest release bundle
wget https://github.com/voldardard/mkv2castUI/releases/latest/download/deployment-bundle.tar.gz

# Extract
tar -xzf deployment-bundle.tar.gz
cd deployment
```

### Option 2: From Repository

```bash
# Clone and use deployment directory
git clone https://github.com/voldardard/mkv2castUI.git
cd mkv2castUI/deployment
```

### Option 3: Manual Download

Download individual files:
- `deployment/docker-compose.yml`
- `deployment/env.example`
- `deployment/deploy.sh`
- `deployment/update.sh`
- `deployment/README.md`

## Quick Start

### 1. Extract Bundle

```bash
tar -xzf deployment-bundle.tar.gz
cd deployment
```

### 2. Configure Environment

```bash
# Copy example file
cp env.example .env

# Edit configuration
nano .env  # or use your preferred editor
```

**Minimum required configuration:**
```bash
DJANGO_SECRET_KEY=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
```

### 3. Deploy

**Using automated script:**
```bash
chmod +x deploy.sh
./deploy.sh
```

**Or manually:**
```bash
docker-compose pull
docker-compose up -d
```

### 4. Create Admin User

```bash
docker-compose exec backend python manage.py createadminuser \
  --username admin \
  --email admin@example.com \
  --password 'YourSecurePassword123!'
```

### 5. Access Application

Open http://localhost:8080 in your browser.

## Configuration

### Essential Settings

Edit `.env` file with your configuration:

```bash
# Required
DJANGO_SECRET_KEY=your-secret-key-here
POSTGRES_PASSWORD=your-secure-password
DJANGO_ALLOWED_HOSTS=your-domain.com

# Optional
REQUIRE_AUTH=false  # Set to false for local mode
NGINX_PORT=8080
```

### Authentication Modes

**Local Mode** (no authentication):
```bash
REQUIRE_AUTH=false
```

**OAuth Mode**:
```bash
REQUIRE_AUTH=true
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
NEXTAUTH_SECRET=your-nextauth-secret
```

### Hardware Acceleration

```bash
# Auto-detect (recommended)
MKV2CAST_DEFAULT_HW=auto

# Or specify
MKV2CAST_DEFAULT_HW=vaapi  # For Intel/AMD GPU
MKV2CAST_DEFAULT_HW=nvenc  # For NVIDIA GPU
```

### Storage Configuration

**Local Storage** (MinIO - default):
```bash
USE_S3=false
```

**External S3**:
```bash
USE_S3=true
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET_NAME=mkv2cast
S3_REGION=us-east-1
```

## Updating

### Using Update Script

```bash
./update.sh
```

The script will:
1. Create a database backup
2. Pull latest images
3. Restart services with new images
4. Run migrations automatically

### Manual Update

```bash
# Pull latest images
docker-compose pull

# Stop services
docker-compose down

# Start with new images
docker-compose up -d
```

## Management

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f celery
```

### Stop Services

```bash
docker-compose down
```

### Stop and Remove Volumes

```bash
docker-compose down -v
```

**Warning**: This will delete all data including database and media files!

### Restart Service

```bash
docker-compose restart backend
```

### Execute Commands

```bash
# Django management
docker-compose exec backend python manage.py shell
docker-compose exec backend python manage.py migrate

# Database access
docker-compose exec postgres psql -U mkv2cast

# Check hardware acceleration
docker-compose exec celery vainfo
```

## Backup and Restore

### Database Backup

```bash
# Create backup
docker-compose exec postgres \
  pg_dump -U mkv2cast mkv2cast > backup_$(date +%Y%m%d).sql

# Or automated
./backup.sh  # If available
```

### Database Restore

```bash
cat backup.sql | docker-compose exec -T postgres \
  psql -U mkv2cast mkv2cast
```

### Media Files Backup

```bash
docker run --rm \
  -v mkv2castui_media_files:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/media_backup_$(date +%Y%m%d).tar.gz /data
```

### Full Backup

```bash
# Backup database
docker-compose exec postgres \
  pg_dump -U mkv2cast mkv2cast > db_backup.sql

# Backup media
docker run --rm \
  -v mkv2castui_media_files:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/media_backup.tar.gz /data

# Backup volumes
docker run --rm \
  -v mkv2castui_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_volume_backup.tar.gz /data
```

## Troubleshooting

### Services Won't Start

1. **Check logs**:
   ```bash
   docker-compose logs
   ```

2. **Verify configuration**:
   - Ensure `.env` file exists
   - Check required variables are set
   - Verify no syntax errors

3. **Check resources**:
   ```bash
   docker stats
   df -h  # Check disk space
   free -h  # Check memory
   ```

4. **Port conflicts**:
   ```bash
   # Check if port is in use
   netstat -tuln | grep 8080
   # Change port in .env: NGINX_PORT=8081
   ```

### Database Connection Errors

1. **Wait for database**:
   - PostgreSQL needs time to initialize
   - Check `postgres` container logs

2. **Verify DATABASE_URL**:
   - Should match POSTGRES_USER and POSTGRES_PASSWORD
   - Format: `postgresql://user:password@postgres:5432/dbname`

### VAAPI Not Working

```bash
# Check device on host
ls -la /dev/dri/

# Verify in container
docker-compose exec celery vainfo

# Check device is mounted
docker-compose exec celery ls -la /dev/dri/
```

### Out of Memory

1. **Reduce workers**:
   ```bash
   # In .env
   GUNICORN_WORKERS=2
   CELERY_WORKER_CONCURRENCY=1
   ```

2. **Check memory usage**:
   ```bash
   docker stats
   ```

### WebSocket Connection Failed

1. **Check Daphne**:
   ```bash
   docker-compose logs daphne
   ```

2. **Check nginx**:
   ```bash
   docker-compose logs nginx
   ```

3. **Verify routing**:
   - Check nginx configuration
   - Verify WebSocket proxy settings

## Advanced Usage

### Custom Docker Compose

You can extend the bundle's `docker-compose.yml`:

```bash
# Create docker-compose.override.yml
cat > docker-compose.override.yml << EOF
services:
  celery:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
EOF
```

### Environment-Specific Configs

```bash
# Development
cp env.example .env.dev

# Production
cp env.example .env.prod

# Use specific env file
docker-compose --env-file .env.prod up -d
```

### Scaling Services

```bash
# Scale Celery workers
docker-compose up -d --scale celery=4

# Note: Requires load balancer for backend/frontend
```

## Creating Your Own Bundle

To create a custom deployment bundle:

```bash
# Create bundle directory
mkdir -p my-bundle
cd my-bundle

# Copy files
cp ../deployment/docker-compose.yml .
cp ../deployment/env.example .
cp ../deployment/deploy.sh .
cp ../deployment/update.sh .
cp ../deployment/README.md .

# Customize as needed
# ...

# Create archive
cd ..
tar -czf my-custom-bundle.tar.gz my-bundle/
```

## Support

- **Bundle README**: See `deployment/README.md`
- **Full Documentation**: https://voldardard.github.io/mkv2castUI/
- **GitHub**: https://github.com/voldardard/mkv2castUI
- **Issues**: https://github.com/voldardard/mkv2castUI/issues
