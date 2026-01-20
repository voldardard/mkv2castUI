# mkv2castUI Deployment Guide

This guide provides an overview of all deployment options for mkv2castUI.

## Deployment Options

mkv2castUI can be deployed using several methods:

1. **[Docker Hub](./docs/deployment/docker-hub.md)** - Using pre-built images from Docker Hub
2. **[Portainer](./docs/deployment/portainer.md)** - Web-based deployment via Portainer stacks
3. **[Deployment Bundle](./docs/deployment/bundle.md)** - Standalone bundle for quick deployment
4. **[GitHub Container Registry](./docs/deployment/docker.md)** - Using GHCR images (production)
5. **[From Source](./docs/getting-started/installation.md)** - Building from source code

## Quick Comparison

| Method | Best For | Difficulty | Speed | Features |
|--------|---------|------------|-------|----------|
| **Docker Hub** | General use, public deployments, CI/CD | Easy | Fast | Fast CDN, public registry, versioned |
| **Portainer** | GUI-based management, beginners | Easy | Fast | Web UI, one-click deploy, easy updates |
| **Deployment Bundle** | Quick setup, offline installs | Easy | Fast | Standalone, scripts included |
| **GHCR** | Production, GitHub integration | Easy | Fast | Private registry, GitHub integration |
| **From Source** | Development, customization | Medium | Slow | Full control, custom builds |

## Prerequisites

All deployment methods require:
- **Docker** 20.10+ and **Docker Compose** v2+
- **4GB RAM** minimum (8GB recommended for encoding)
- **20GB disk space** (more for video files)
- (Optional) Intel/AMD GPU for hardware acceleration

## Quick Start

### Option 1: Docker Hub (Recommended for Most Users)

**Best for:** Command-line users, quick deployments, CI/CD pipelines

```bash
# 1. Download configuration
git clone https://github.com/voldardard/mkv2castUI.git
cd mkv2castUI

# 2. Configure environment
cp .env.example .env
# Edit .env - minimum required:
#   DJANGO_SECRET_KEY=$(openssl rand -hex 32)
#   POSTGRES_PASSWORD=$(openssl rand -hex 16)
#   DJANGO_ALLOWED_HOSTS=localhost,your-domain.com

# 3. Deploy
docker-compose -f docker-compose.dockerhub.yml pull
docker-compose -f docker-compose.dockerhub.yml up -d

# 4. Create admin user
docker-compose -f docker-compose.dockerhub.yml exec backend \
  python manage.py createadminuser \
  --username admin --email admin@example.com --password 'YourPassword'

# 5. Access at http://localhost:8080
```

**Images:** `docker.io/voldardard/mkv2castui-*:latest`

See [Docker Hub Deployment Guide](./docs/deployment/docker-hub.md) for complete details.

### Option 2: Portainer Stack (Recommended for GUI Users)

**Best for:** Web-based management, users preferring GUI, easy updates

**Quick Setup:**
1. Open Portainer (usually http://your-server:9000)
2. Go to **Stacks** > **Add Stack**
3. Name: `mkv2castui`
4. Build method: **Web editor**
5. Copy contents from [`portainer/stack.yml`](https://raw.githubusercontent.com/voldardard/mkv2castUI/main/portainer/stack.yml)
6. Configure environment variables:
   - `DJANGO_SECRET_KEY` (generate: `openssl rand -hex 32`)
   - `POSTGRES_PASSWORD` (use strong password)
   - `DJANGO_ALLOWED_HOSTS` (your domain/IP)
   - `REQUIRE_AUTH=false` (for local mode, no OAuth needed)
7. Click **Deploy the stack**
8. Wait for services to start (1-2 minutes)
9. Create admin user via Console (see guide)
10. Access at http://your-server:8080

**Alternative: Git Repository Method**
1. In Portainer: **Stacks** > **Add Stack** > **Repository**
2. Repository URL: `https://github.com/voldardard/mkv2castUI`
3. Compose path: `portainer/stack.yml`
4. Configure and deploy

See [Portainer Deployment Guide](./docs/deployment/portainer.md) for complete instructions with screenshots and troubleshooting.

### Option 3: Deployment Bundle

```bash
# 1. Download and extract bundle
wget https://github.com/voldardard/mkv2castUI/releases/latest/download/deployment-bundle.tar.gz
tar -xzf deployment-bundle.tar.gz
cd deployment

# 2. Configure
cp env.example .env
# Edit .env

# 3. Deploy
./deploy.sh
```

See [Deployment Bundle Guide](./docs/deployment/bundle.md) for details.

## Configuration

### Essential Settings

All deployment methods require these environment variables:

```bash
# Required
DJANGO_SECRET_KEY=your-secret-key  # Generate: openssl rand -hex 32
POSTGRES_PASSWORD=your-password
DJANGO_ALLOWED_HOSTS=localhost,your-domain.com

# Optional
REQUIRE_AUTH=false  # Set to false for local mode (no authentication)
NGINX_PORT=8080
```

### Authentication Modes

**Local Mode** (no authentication):
```bash
REQUIRE_AUTH=false
```

**OAuth Mode** (Google/GitHub):
```bash
REQUIRE_AUTH=true
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
NEXTAUTH_SECRET=your-nextauth-secret
```

See [Configuration Guide](./docs/getting-started/configuration.md) for all options.

## Creating Admin User

After deployment, create an admin user:

```bash
# Using Docker Compose
docker-compose exec backend python manage.py createadminuser \
  --username admin \
  --email admin@example.com \
  --password 'YourSecurePassword123!'

# Using Portainer
# Go to backend container > Console > Execute command
```

## Updating

### Docker Hub / GHCR

```bash
docker-compose -f docker-compose.dockerhub.yml pull
docker-compose -f docker-compose.dockerhub.yml down
docker-compose -f docker-compose.dockerhub.yml up -d
```

### Portainer

1. Go to **Stacks** > **mkv2castui**
2. Click **Editor**
3. Update image tags if needed
4. Click **Update the stack**

### Deployment Bundle

```bash
./update.sh
```

## Service Management

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f celery
```

### Restart Services

```bash
# All services
docker-compose restart

# Specific service
docker-compose restart backend
```

### Stop Services

```bash
docker-compose down
```

### Check Status

```bash
docker-compose ps
```

## Backup and Restore

### Database Backup

```bash
docker-compose exec postgres \
  pg_dump -U mkv2cast mkv2cast > backup_$(date +%Y%m%d).sql
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
  alpine tar czf /backup/media_backup.tar.gz /data
```

## Troubleshooting

### Services Won't Start

1. Check logs: `docker-compose logs`
2. Verify `.env` file is configured
3. Ensure ports are not in use
4. Check disk space: `df -h`

### Database Connection Errors

1. Wait for PostgreSQL to initialize
2. Verify `DATABASE_URL` matches credentials
3. Check `postgres` container logs

### VAAPI Not Working

```bash
# Check device
ls -la /dev/dri/

# Verify in container
docker-compose exec celery vainfo
```

### Out of Memory

1. Reduce `CELERY_WORKER_CONCURRENCY` in `.env`
2. Reduce `GUNICORN_WORKERS` in `.env`
3. Check memory: `docker stats`

See [Troubleshooting Guide](./README.md#-troubleshooting) for more solutions.

## Hardware Acceleration

### VAAPI (Intel/AMD GPU)

Already configured in docker-compose files. Just set:
```bash
MKV2CAST_DEFAULT_HW=vaapi
```

### NVIDIA NVENC

Requires `nvidia-docker2` and runtime configuration:
```yaml
# Add to celery service
runtime: nvidia
environment:
  - NVIDIA_VISIBLE_DEVICES=all
```

See [Hardware Acceleration Guide](./docs/user-guide/hardware-acceleration.md) for details.

## Production Considerations

### Security

- Use strong passwords and secrets
- Enable HTTPS (use reverse proxy)
- Restrict `DJANGO_ALLOWED_HOSTS`
- Keep images updated
- Use external S3 for storage

### Performance

- Adjust worker counts based on resources
- Use hardware acceleration when available
- Configure appropriate timeouts
- Monitor resource usage

### Monitoring

- Set up health checks
- Monitor logs regularly
- Track disk space usage
- Monitor conversion queue

## Support

- **Documentation**: https://voldardard.github.io/mkv2castUI/
- **GitHub**: https://github.com/voldardard/mkv2castUI
- **Issues**: https://github.com/voldardard/mkv2castUI/issues
- **Discussions**: https://github.com/voldardard/mkv2castUI/discussions

## Related Documentation

- [Configuration Guide](./docs/getting-started/configuration.md)
- [Docker Hub Deployment](./docs/deployment/docker-hub.md)
- [Portainer Deployment](./docs/deployment/portainer.md)
- [Deployment Bundle](./docs/deployment/bundle.md)
- [Production Deployment](./docs/deployment/docker.md)
- [Hardware Acceleration](./docs/user-guide/hardware-acceleration.md)
