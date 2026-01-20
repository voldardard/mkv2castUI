# Docker Hub Deployment

This guide explains how to deploy mkv2castUI using pre-built images from Docker Hub.

## Overview

mkv2castUI images are automatically published to Docker Hub on every release. Images are available at:
- `docker.io/voldardard/mkv2castui-backend:latest`
- `docker.io/voldardard/mkv2castui-frontend:latest`
- `docker.io/voldardard/mkv2castui-nginx:latest`

**Why Docker Hub?**
- ✅ Fast downloads via global CDN
- ✅ No authentication required for public images
- ✅ Works with all Docker-compatible tools
- ✅ Versioned releases for stability
- ✅ Compatible with Portainer, Docker Compose, and more

## Quick Start

### 1. Prerequisites

- Docker 20.10+ and Docker Compose v2+
- 4GB RAM minimum (8GB recommended)
- 20GB disk space

### 2. Download Configuration

**Option A: Clone Repository (Recommended)**
```bash
git clone https://github.com/voldardard/mkv2castUI.git
cd mkv2castUI
```

**Option B: Download Just Docker Compose File**
```bash
# Download docker-compose file
wget https://raw.githubusercontent.com/voldardard/mkv2castUI/main/docker-compose.dockerhub.yml

# Download environment example
wget https://raw.githubusercontent.com/voldardard/mkv2castUI/main/deployment/env.example
```

### 3. Configure Environment

**Quick Setup (Local Mode - No Authentication)**
```bash
# Create .env file with minimal configuration
cat > .env << EOF
DJANGO_SECRET_KEY=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
REQUIRE_AUTH=false
EOF
```

**Full Setup (With OAuth)**
```bash
# Copy example file
cp .env.example .env  # or env.example if downloaded separately

# Edit .env and configure:
# - DJANGO_SECRET_KEY (required)
# - POSTGRES_PASSWORD (required)
# - DJANGO_ALLOWED_HOSTS (required)
# - REQUIRE_AUTH=true (for OAuth)
# - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (if using Google OAuth)
# - GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET (if using GitHub OAuth)
```

### 4. Deploy

```bash
# Pull latest images
docker-compose -f docker-compose.dockerhub.yml pull

# Start services
docker-compose -f docker-compose.dockerhub.yml up -d

# Check status
docker-compose -f docker-compose.dockerhub.yml ps
```

### 5. Create Admin User

```bash
docker-compose -f docker-compose.dockerhub.yml exec backend \
  python manage.py createadminuser \
  --username admin \
  --email admin@example.com \
  --password 'YourSecurePassword123!'
```

### 6. Access Application

Open http://localhost:8080 in your browser.

## Image Tags

Images are tagged with:
- `latest` - Latest stable release
- `v1.0.0` - Specific version
- `1.0` - Major.minor version
- `sha-abc123` - Git commit SHA

### Using Specific Versions

```yaml
# In docker-compose.dockerhub.yml
services:
  backend:
    image: docker.io/voldardard/mkv2castui-backend:v1.0.0
```

## Updating

### Automatic Update

```bash
# Pull latest images
docker-compose -f docker-compose.dockerhub.yml pull

# Restart services
docker-compose -f docker-compose.dockerhub.yml down
docker-compose -f docker-compose.dockerhub.yml up -d
```

### Update to Specific Version

```bash
# Edit docker-compose.dockerhub.yml to use specific version
# Then pull and restart
docker-compose -f docker-compose.dockerhub.yml pull
docker-compose -f docker-compose.dockerhub.yml up -d
```

## Configuration

See [Configuration Guide](../getting-started/configuration.md) for all available options.

### Essential Variables

**Required:**
```bash
DJANGO_SECRET_KEY=your-secret-key  # Generate: openssl rand -hex 32
POSTGRES_PASSWORD=your-password     # Use strong password
DJANGO_ALLOWED_HOSTS=your-domain.com,localhost  # Comma-separated list
```

**Optional (with defaults):**
```bash
REQUIRE_AUTH=false      # Set to false for local mode (no authentication)
NGINX_PORT=8080         # Web interface port
POSTGRES_USER=mkv2cast  # Database username
POSTGRES_DB=mkv2cast    # Database name
```

### Authentication Configuration

**Local Mode (No Authentication):**
```bash
REQUIRE_AUTH=false
# No OAuth credentials needed
```

**OAuth Mode (Google/GitHub):**
```bash
REQUIRE_AUTH=true
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
NEXTAUTH_SECRET=your-nextauth-secret  # Generate: openssl rand -hex 32
NEXTAUTH_URL=http://localhost:8080    # Your application URL
```

### Hardware Acceleration

```bash
# Auto-detect (recommended)
MKV2CAST_DEFAULT_HW=auto

# Or specify manually
MKV2CAST_DEFAULT_HW=vaapi  # Intel/AMD GPU
MKV2CAST_DEFAULT_HW=nvenc  # NVIDIA GPU (requires nvidia-docker2)
MKV2CAST_DEFAULT_HW=cpu    # Software encoding
```

### Storage Configuration

**Local Storage (MinIO - Default):**
```bash
USE_S3=false
# MinIO runs in container, no additional config needed
```

**External S3:**
```bash
USE_S3=true
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET_NAME=mkv2cast
S3_REGION=us-east-1
```

## Troubleshooting

### Images Not Found

If you get "image not found" errors:
1. Check Docker Hub: https://hub.docker.com/r/voldardard/mkv2castui-backend
2. Verify image tags exist
3. Try pulling manually: `docker pull docker.io/voldardard/mkv2castui-backend:latest`

### Pull Rate Limits

Docker Hub has rate limits for anonymous pulls. If you hit limits:
1. Create a Docker Hub account
2. Login: `docker login`
3. Pull images will use your authenticated rate limit

### Version Compatibility

Always use matching versions for all services:
- `backend`, `frontend`, and `nginx` should use the same version tag
- Check release notes for breaking changes

## Advantages of Docker Hub

- **Fast Downloads**: Docker Hub CDN provides fast image pulls
- **Public Registry**: No authentication required for public images
- **Version Control**: Tagged releases for stability
- **Compatibility**: Works with all Docker-compatible tools

## Alternative: GitHub Container Registry

If you prefer GitHub Container Registry:
- Use `docker-compose.prod.yml` instead
- Images: `ghcr.io/voldardard/mkv2castui-*:latest`

See [Production Deployment](./docker.md) for details.

## Support

- **Documentation**: https://voldardard.github.io/mkv2castUI/
- **GitHub**: https://github.com/voldardard/mkv2castUI
- **Issues**: https://github.com/voldardard/mkv2castUI/issues
