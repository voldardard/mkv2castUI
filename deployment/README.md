# mkv2castUI Deployment Bundle

This is a standalone deployment bundle for mkv2castUI using pre-built Docker images from Docker Hub.

## Quick Start

### Prerequisites

- Docker 20.10+ and Docker Compose v2+
- 4GB RAM minimum (8GB recommended for encoding)
- 20GB disk space (more for video files)
- (Optional) Intel/AMD GPU for hardware acceleration

### Installation

1. **Extract the bundle** (if downloaded as archive):
   ```bash
   tar -xzf deployment-bundle.tar.gz
   cd deployment
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Deploy**:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

   Or manually:
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

4. **Create admin user**:
   ```bash
   docker-compose exec backend python manage.py createadminuser \
     --username admin \
     --email admin@example.com \
     --password 'YourSecurePassword123!'
   ```

5. **Access the application**:
   Open http://localhost:8080 in your browser

## Configuration

### Essential Settings

Edit `.env` and configure at minimum:

- `DJANGO_SECRET_KEY` - Generate with: `openssl rand -hex 32`
- `POSTGRES_PASSWORD` - Set a secure password
- `DJANGO_ALLOWED_HOSTS` - Add your domain(s)

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

### Hardware Acceleration

For Intel/AMD GPU (VAAPI):
```bash
MKV2CAST_DEFAULT_HW=vaapi
MKV2CAST_VAAPI_DEVICE=/dev/dri/renderD128
```

For NVIDIA GPU (requires nvidia-docker2):
```bash
MKV2CAST_DEFAULT_HW=nvenc
# Add to docker-compose.yml celery service:
# runtime: nvidia
# environment:
#   - NVIDIA_VISIBLE_DEVICES=all
```

### Storage Options

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

Use the update script:
```bash
./update.sh
```

Or manually:
```bash
docker-compose pull
docker-compose down
docker-compose up -d
```

## Management Commands

### View Logs
```bash
docker-compose logs -f
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

### Restart a Service
```bash
docker-compose restart backend
```

### Execute Commands
```bash
# Django shell
docker-compose exec backend python manage.py shell

# Database shell
docker-compose exec postgres psql -U mkv2cast

# Check VAAPI
docker-compose exec celery vainfo
```

## Backup & Restore

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
- Check logs: `docker-compose logs`
- Verify `.env` file is configured correctly
- Ensure ports are not in use
- Check disk space: `df -h`

### VAAPI Not Working
```bash
# Check device on host
ls -la /dev/dri/

# Verify in container
docker-compose exec celery vainfo
```

### Out of Memory
- Reduce `CELERY_WORKER_CONCURRENCY` in `.env`
- Reduce `GUNICORN_WORKERS` in `.env`
- Check memory: `docker stats`

### WebSocket Connection Failed
- Check Daphne logs: `docker-compose logs daphne`
- Verify nginx routing: `docker-compose logs nginx`

## Support

- **Documentation**: https://voldardard.github.io/mkv2castUI/
- **GitHub**: https://github.com/voldardard/mkv2castUI
- **Issues**: https://github.com/voldardard/mkv2castUI/issues

## License

Copyright (c) 2026 mkv2cast Project

Licensed under the **Business Source License 1.1** (BSL 1.1).
