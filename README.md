# mkv2castUI

[![Tests](https://github.com/voldardard/mkv2castUI/actions/workflows/tests.yml/badge.svg)](https://github.com/voldardard/mkv2castUI/actions/workflows/tests.yml)
[![Documentation](https://github.com/voldardard/mkv2castUI/actions/workflows/docs.yml/badge.svg)](https://voldardard.github.io/mkv2castUI/)
[![License: BSL 1.1](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![Node 20+](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

> **BETA SOFTWARE (v0.2.0-beta)** - This software is under active development. APIs and features may change.

**mkv2castUI** is a modern, self-hosted web application for converting MKV video files to Chromecast-compatible formats. Built on top of the intelligent [mkv2cast](https://pypi.org/project/mkv2cast/) CLI tool, it provides a beautiful web interface with real-time progress tracking, hardware acceleration support, and enterprise-grade authentication.

📖 **[Full Documentation](https://voldardard.github.io/mkv2castUI/)** | 🐍 **[mkv2cast CLI Docs](https://voldardard.github.io/mkv2cast/)** | 📦 **[PyPI](https://pypi.org/project/mkv2cast/)**

---

## Table of Contents

- [Why mkv2castUI?](#-why-mkv2castui)
- [Features](#-features)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Docker & Build Options](#-docker--build-options)
- [Makefile Commands](#-makefile-commands)
- [Configuration](#-configuration)
- [Deployment](#-deployment)
- [API Reference](#-api-reference)
- [Development](#-development)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Why mkv2castUI?

### The Problem

You have MKV files with various codecs (HEVC, DTS, AC3...) that won't play on your Chromecast or other streaming devices. Traditional converters either:
- Re-encode everything (slow, quality loss)
- Require command-line knowledge
- Lack progress tracking
- Don't optimize for Chromecast

### The Solution

**mkv2castUI** combines the intelligence of mkv2cast with a modern web interface:

- **🧠 Smart Analysis** - Only transcodes streams that need conversion
- **⚡ Hardware Acceleration** - VAAPI/QSV/NVENC for blazing fast encoding
- **📊 Real-time Progress** - WebSocket-based live updates with ETA
- **🏠 100% On-Premise** - Your files never leave your server
- **🔐 Flexible Auth** - OAuth, 2FA, or no-auth local mode
- **🌍 Multi-language** - EN, FR, DE, ES, IT

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Drag & Drop Upload** | Simply drop your MKV files |
| **Smart Conversion** | Analyzes streams, only transcodes what's needed |
| **Hardware Acceleration** | NVENC (NVIDIA), VAAPI (Intel/AMD), QSV (Intel), CPU |
| **Real-time Progress** | WebSocket updates with ETA, speed, bitrate |
| **Batch Processing** | Convert multiple files at once |
| **History** | View all past conversions |
| **Download** | Direct download of converted files |
| **OAuth 2.0** | Google & GitHub authentication |
| **2FA (TOTP)** | Two-factor authentication support |
| **Local Mode** | Run without any authentication |
| **Admin Panel** | User management, statistics |
| **REST API** | Full programmatic access |
| **Internationalization** | 5 languages supported |
| **Responsive Design** | Works on desktop and mobile |
| **S3-Compatible Storage** | Support for AWS S3, MinIO, Backblaze B2, etc. |
| **Docker Compose** | One-command deployment |
| **Health Checks** | Built-in monitoring endpoints |

---

## 🏗️ Architecture

```
mkv2castUI/
├── frontend/          # Next.js 14 React application
│   ├── src/
│   │   ├── app/       # App router pages
│   │   ├── components/# React components
│   │   ├── hooks/     # Custom hooks
│   │   └── lib/       # Utilities
│   └── __tests__/     # Jest tests
├── backend/           # Django 5 REST API
│   ├── accounts/      # User authentication
│   ├── conversions/   # Video conversion logic
│   ├── mkv2cast_api/  # Django project config
│   └── tests/         # Pytest tests
├── nginx/             # Reverse proxy config
├── e2e/               # Playwright E2E tests
├── docs/              # Sphinx documentation
└── docker-compose.yml
```

### Services

| Service | Port | Technology | Description |
|---------|------|------------|-------------|
| **nginx** | 8080 | Nginx | Reverse proxy, static files |
| **frontend** | 3000 | Next.js 14 | React UI |
| **backend** | 8000 | Django 5 + Gunicorn | REST API |
| **daphne** | 8001 | Django Channels | WebSocket server |
| **celery** | - | Celery | Background workers |
| **postgres** | 5432 | PostgreSQL 16 | Database |
| **redis** | 6379 | Redis 7 | Cache & message broker |
| **minio** | 9000/9001 | MinIO | S3-compatible storage (dev) |

---

## 🚀 Quick Start

### Prerequisites

- **Docker** 20.10+ & **Docker Compose** v2+
- **4GB RAM** minimum (8GB recommended for encoding)
- **20GB disk space** (more for video files)
- (Optional) Intel/AMD GPU for hardware acceleration

### 5-Minute Setup

```bash
# 1. Clone
git clone https://github.com/voldardard/mkv2castUI.git
cd mkv2castUI

# 2. Configure (local mode - no auth required)
cp .env.example .env
echo "REQUIRE_AUTH=false" >> .env
echo "DJANGO_SECRET_KEY=$(openssl rand -hex 32)" >> .env
echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)" >> .env

# 3. Build and run
make build
make up

# 4. Open http://localhost:8080
```

That's it! 🎉

---

## 🐳 Docker & Build Options

### Docker Compose Files

#### `docker-compose.yml` (Development)

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

#### `docker-compose.prod.yml` (Production)

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

### Docker Build Options

#### Backend Dockerfile

**Build Arguments:**
- None (uses Python 3.12-slim base image)

**Environment Variables (build-time):**
- `PYTHONDONTWRITEBYTECODE=1`
- `PYTHONUNBUFFERED=1`
- `PYTHONPATH=/app`
- `DJANGO_SETTINGS_MODULE=mkv2cast_api.settings`

**System Dependencies:**
- FFmpeg (video processing)
- PostgreSQL client libraries
- VAAPI drivers (Intel/AMD GPU support)
- Pillow dependencies (image processing)

**Example:**
```bash
cd backend
docker build -t mkv2castui-backend:latest .
docker build --no-cache -t mkv2castui-backend:dev .
```

#### Frontend Dockerfile

**Multi-stage Build:**
1. **Builder stage**: Installs dependencies and builds Next.js app
2. **Runner stage**: Minimal production image with only built files

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

#### Nginx Dockerfile

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

### Docker Compose Commands

#### Service Management

```bash
# Start all services
docker-compose up -d
# or
make up

# Stop all services
docker-compose down
# or
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

#### Logs

```bash
# All services
docker-compose logs -f
# or
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

#### Executing Commands

```bash
# Django management commands
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
docker-compose exec backend python manage.py createadminuser --username admin --email admin@example.com --password 'pass'

# Shell access
docker-compose exec backend bash
docker-compose exec frontend sh
docker-compose exec postgres psql -U mkv2cast

# Check VAAPI
docker-compose exec celery vainfo

# Check Redis
docker-compose exec redis redis-cli ping
```

#### Scaling Services

```bash
# Scale Celery workers
docker-compose up -d --scale celery=4

# Scale backend (requires load balancer)
docker-compose up -d --scale backend=3
```

#### Volumes

```bash
# List volumes
docker volume ls | grep mkv2cast

# Inspect volume
docker volume inspect mkv2castui_postgres_data

# Backup volume
docker run --rm -v mkv2castui_postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres_backup.tar.gz /data

# Remove unused volumes
docker volume prune
```

#### Networks

```bash
# Inspect network
docker network inspect mkv2castui_mkv2cast-network

# Connect external container
docker network connect mkv2castui_mkv2cast-network my-container
```

### Hardware Acceleration Setup

#### VAAPI (Intel/AMD GPU)

```bash
# Check device on host
ls -la /dev/dri/

# Device is automatically mounted in docker-compose.yml
# Verify in container
docker-compose exec celery vainfo
```

#### NVIDIA NVENC

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

---

## 🔧 Makefile Commands

The project includes a comprehensive Makefile for common operations:

### Version Management

```bash
# Show current version
make version

# Prepare release (updates versions in all files)
make release VERSION=v0.2.0

# Prepare, commit, tag and push release
make release-push VERSION=v0.2.0

# Check release readiness
make check
```

### Docker Operations

```bash
# Build Docker images
make build

# Build production images
make build-prod

# Start all services
make up

# Stop all services
make down

# View logs
make logs

# Clean Docker resources (volumes, images)
make clean
```

### Database Migrations

```bash
# Create migrations (Docker)
make migrations

# Apply migrations (Docker)
make migrate

# Check for pending migrations
make migrations-check

# Create migrations (local, no Docker)
make migrations-backend

# Apply migrations (local, no Docker)
make migrate-backend
```

### Testing

```bash
# Run all tests
make test

# Backend tests only
make test-backend

# Frontend tests only
make test-frontend

# E2E tests
make test-e2e
```

### Code Quality

```bash
# Run linters
make lint

# Format code
make format
```

### Documentation

```bash
# Build documentation locally
make docs-build

# Build and serve documentation
make docs-serve
```

### Development Setup

```bash
# Install all dependencies (backend, frontend, e2e)
make install
```

### Help

```bash
# Show all available commands
make help
```

---

## ⚙️ Configuration

All configuration is done via environment variables. See [full configuration docs](https://voldardard.github.io/mkv2castUI/getting-started/configuration.html).

### Essential Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `REQUIRE_AUTH` | Enable OAuth authentication | `true` |
| `DJANGO_SECRET_KEY` | Django secret key | **Required** |
| `POSTGRES_PASSWORD` | Database password | **Required** |
| `MKV2CAST_DEFAULT_HW` | Hardware backend (`auto`/`cpu`/`vaapi`/`qsv`/`nvenc`) | `auto` |
| `MKV2CAST_DEFAULT_CRF` | Video quality (0-51, lower=better) | `23` |
| `MKV2CAST_MAX_FILE_SIZE` | Max upload size (bytes) | `10737418240` (10GB) |

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
```

### Hardware Acceleration

```bash
# Auto-detect best available
MKV2CAST_DEFAULT_HW=auto

# Force NVIDIA NVENC (requires nvidia-docker2)
MKV2CAST_DEFAULT_HW=nvenc

# Force VAAPI (Intel/AMD GPU)
MKV2CAST_DEFAULT_HW=vaapi
MKV2CAST_VAAPI_DEVICE=/dev/dri/renderD128

# Force Intel Quick Sync
MKV2CAST_DEFAULT_HW=qsv

# Force CPU (software encoding)
MKV2CAST_DEFAULT_HW=cpu
```

### Advanced Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `GUNICORN_WORKERS` | Number of Gunicorn workers | `4` |
| `GUNICORN_TIMEOUT` | Request timeout (seconds) | `120` |
| `CELERY_WORKER_CONCURRENCY` | Number of Celery worker processes | `2` |
| `MKV2CAST_DEFAULT_PRESET` | Encoding preset (`ultrafast`/`fast`/`medium`/`slow`) | `medium` |
| `MKV2CAST_DEFAULT_AUDIO_BITRATE` | Audio bitrate | `192k` |
| `USE_S3` | Enable S3-compatible storage | `false` |
| `S3_ENDPOINT` | S3 endpoint URL | - |
| `S3_BUCKET_NAME` | S3 bucket name | `mkv2cast` |

See [Configuration Documentation](https://voldardard.github.io/mkv2castUI/getting-started/configuration.html) for complete reference.

---

## 🚢 Deployment

mkv2castUI can be deployed using multiple methods. See [DEPLOYMENT.md](DEPLOYMENT.md) for complete guide.

**Quick Links:**
- 🐳 [Docker Hub Deployment](docs/deployment/docker-hub.md) - Pre-built images from Docker Hub
- 🖥️ [Portainer Deployment](docs/deployment/portainer.md) - Web-based GUI deployment
- 📦 [Deployment Bundle](docs/deployment/bundle.md) - Standalone deployment package

### Quick Deployment Options

#### Option 1: Docker Hub (Recommended)

The easiest way to deploy using pre-built images from Docker Hub:

```bash
# 1. Clone repository or download docker-compose file
git clone https://github.com/voldardard/mkv2castUI.git
cd mkv2castUI

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings (minimum: DJANGO_SECRET_KEY, POSTGRES_PASSWORD)

# 3. Pull and start
docker-compose -f docker-compose.dockerhub.yml pull
docker-compose -f docker-compose.dockerhub.yml up -d

# 4. Create admin user
docker-compose -f docker-compose.dockerhub.yml exec backend \
  python manage.py createadminuser \
  --username admin --email admin@example.com --password 'YourPassword'

# 5. Access at http://localhost:8080
```

**Images available on Docker Hub:**
- `docker.io/voldardard/mkv2castui-backend:latest`
- `docker.io/voldardard/mkv2castui-frontend:latest`
- `docker.io/voldardard/mkv2castui-nginx:latest`

See [Docker Hub Deployment Guide](docs/deployment/docker-hub.md) for details.

#### Option 2: Portainer Stack

Deploy via Portainer's web interface in just a few clicks:

**Method A: Using Stack File**
1. Open Portainer → **Stacks** → **Add Stack**
2. Name: `mkv2castui`
3. Build method: **Web editor**
4. Copy contents from [`portainer/stack.yml`](portainer/stack.yml)
5. Configure environment variables (see below)
6. Click **Deploy the stack**

**Method B: Using Git Repository**
1. Open Portainer → **Stacks** → **Add Stack**
2. Select **Repository**
3. Repository URL: `https://github.com/voldardard/mkv2castUI`
4. Compose path: `portainer/stack.yml`
5. Configure environment variables
6. Click **Deploy the stack**

**Required Environment Variables:**
```yaml
DJANGO_SECRET_KEY: "generate-with-openssl-rand-hex-32"
POSTGRES_PASSWORD: "your-secure-password"
DJANGO_ALLOWED_HOSTS: "localhost,your-domain.com"
```

**For local mode (no authentication):**
```yaml
REQUIRE_AUTH: "false"
```

See [Portainer Deployment Guide](docs/deployment/portainer.md) for complete instructions.

#### Option 3: Deployment Bundle

```bash
# Download and extract bundle
wget https://github.com/voldardard/mkv2castUI/releases/latest/download/deployment-bundle.tar.gz
tar -xzf deployment-bundle.tar.gz
cd deployment
./deploy.sh
```

#### Option 4: GitHub Container Registry

```bash
# 1. Configure environment
cp .env.example .env

# 2. Pull latest images
docker-compose -f docker-compose.prod.yml pull

# 3. Start services
docker-compose -f docker-compose.prod.yml up -d
```

### Development Deployment

```bash
# Build and start
make build
make up

# Access at http://localhost:8080
```

### Creating Admin User

After deployment, create an admin user:

```bash
docker-compose exec backend python manage.py createadminuser \
  --username admin \
  --email admin@example.com \
  --password 'SecurePassword123!'
```

### Updating / Upgrading

#### Automatic Migrations

Database migrations run **automatically** when the backend container starts. No manual intervention needed for schema updates.

#### Update Procedure

**From Source:**
```bash
# 1. Stop services
docker-compose down

# 2. Pull latest code
git pull origin main

# 3. Rebuild containers
docker-compose build --no-cache

# 4. Start services (migrations run automatically)
docker-compose up -d

# 5. Check logs
docker-compose logs backend | grep -i migrate
```

**Using Pre-built Images (Docker Hub):**
```bash
# 1. Stop services
docker-compose -f docker-compose.dockerhub.yml down

# 2. Pull latest images
docker-compose -f docker-compose.dockerhub.yml pull

# 3. Start services (migrations run automatically)
docker-compose -f docker-compose.dockerhub.yml up -d
```

**Using Pre-built Images (GitHub Container Registry):**
```bash
# 1. Stop services
docker-compose -f docker-compose.prod.yml down

# 2. Pull latest images
docker-compose -f docker-compose.prod.yml pull

# 3. Start services (migrations run automatically)
docker-compose -f docker-compose.prod.yml up -d
```

**Using Portainer:**
1. Go to **Stacks** > **mkv2castui**
2. Click **Editor**
3. Update image tags if needed (or keep `latest` for auto-updates)
4. Click **Update the stack**

### Backup & Restore

#### Database Backup

```bash
# Create backup
docker-compose exec postgres \
  pg_dump -U mkv2cast mkv2cast > backup_$(date +%Y%m%d).sql

# Restore backup
cat backup.sql | docker-compose exec -T postgres \
  psql -U mkv2cast mkv2cast
```

#### Media Files Backup

```bash
# Backup media volume
docker run --rm \
  -v mkv2castui_media_files:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/media_backup.tar.gz /data
```

See [Deployment Documentation](https://voldardard.github.io/mkv2castUI/deployment/docker.html) for detailed guides.

---

## 📚 API Reference

### REST API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/{lang}/api/jobs/` | GET | List conversion jobs |
| `/{lang}/api/jobs/` | POST | Create new job |
| `/{lang}/api/jobs/{id}/` | GET | Get job details |
| `/{lang}/api/jobs/{id}/cancel/` | POST | Cancel job |
| `/{lang}/api/jobs/{id}/download/` | GET | Download file |
| `/{lang}/api/options/` | GET | Get available options |
| `/api/auth/config/` | GET | Get auth configuration |

### WebSocket

```javascript
const ws = new WebSocket('ws://localhost:8080/ws/conversion/{job_id}/');
ws.onmessage = (event) => {
  const { progress, status, eta_seconds } = JSON.parse(event.data);
  console.log(`Progress: ${progress}%, ETA: ${eta_seconds}s`);
};
```

See [Full API Documentation](https://voldardard.github.io/mkv2castUI/api/rest-api.html).

---

## 👤 Admin User Management

### Creating Admin User

```bash
docker-compose exec backend python manage.py createadminuser \
  --username admin \
  --email admin@example.com \
  --password 'YourSecurePassword123!'
```

**Options:**

| Option | Required | Description |
|--------|----------|-------------|
| `--username` | Yes | Admin username |
| `--email` | Yes | Admin email address |
| `--password` | Yes | Admin password (min 8 chars) |
| `--first-name` | No | First name (default: Admin) |
| `--last-name` | No | Last name (default: User) |
| `--no-superuser` | No | Create app admin only, not Django superuser |
| `--update` | No | Update existing user if username/email exists |

### Access Admin Panel

Once logged in, administrators can access the admin panel at:
- `http://localhost:8080/{lang}/admin/` (e.g., `/en/admin/`)

The admin panel provides:
- User management (create, edit, delete users)
- Subscription tier management
- Conversion statistics and graphs
- File management
- Server settings
- White-label branding

---

## 🧪 Testing

### Test Coverage Summary

| Component | Framework | Coverage | Status |
|-----------|-----------|----------|--------|
| Backend | pytest | ~85% | ✅ |
| Frontend | Jest + RTL | ~80% | ✅ |
| E2E | Playwright | Key flows | ✅ |

### Running Tests

**Backend (Python):**
```bash
cd backend
pytest --cov=accounts --cov=conversions --cov-report=html
# Open htmlcov/index.html for coverage report
```

**Frontend (React):**
```bash
cd frontend
npm test
npm run test:coverage
# Coverage in coverage/lcov-report/index.html
```

**E2E (Playwright):**
```bash
cd e2e
npx playwright test
npx playwright show-report
```

**Using Make:**
```bash
make test              # All tests
make test-backend      # Backend only
make test-frontend    # Frontend only
make test-e2e         # E2E only
```

### CI/CD

Tests run automatically on GitHub Actions:
- ✅ Backend tests with PostgreSQL & Redis services
- ✅ Frontend tests with coverage
- ✅ E2E tests with Docker Compose
- ✅ Security scanning with Trivy
- ✅ Build verification

---

## 🔧 Troubleshooting

### Common Issues

<details>
<summary><strong>Container won't start</strong></summary>

```bash
# Check logs
docker-compose logs backend

# Common fixes:
# - Missing .env file: cp .env.example .env
# - Database not ready: wait and retry
# - Port in use: change in docker-compose.yml
# - Permission issues: check volume permissions
```
</details>

<details>
<summary><strong>VAAPI not working</strong></summary>

```bash
# Check VAAPI in container
docker-compose exec celery vainfo

# Check device permissions on host
ls -la /dev/dri/

# Explicit device in .env
MKV2CAST_VAAPI_DEVICE=/dev/dri/renderD128

# Verify device is mounted
docker-compose exec celery ls -la /dev/dri/
```
</details>

<details>
<summary><strong>WebSocket connection failed</strong></summary>

```bash
# Check Daphne
docker-compose logs daphne

# Check nginx routing
docker-compose logs nginx

# Verify WebSocket endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  http://localhost:8080/ws/conversion/test/
```
</details>

<details>
<summary><strong>Upload fails</strong></summary>

```bash
# Increase max file size in .env
MKV2CAST_MAX_FILE_SIZE=21474836480  # 20GB

# Check nginx client_max_body_size in nginx.conf
# Default is 10G

# Check disk space
df -h
docker system df
```
</details>

<details>
<summary><strong>Database connection errors</strong></summary>

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection string
docker-compose exec backend python -c "from django.conf import settings; print(settings.DATABASES)"

# Test connection
docker-compose exec postgres psql -U mkv2cast -d mkv2cast -c "SELECT 1;"
```
</details>

<details>
<summary><strong>Out of memory errors</summary>

```bash
# Reduce Celery concurrency
CELERY_WORKER_CONCURRENCY=1

# Reduce Gunicorn workers
GUNICORN_WORKERS=2

# Check memory usage
docker stats

# Increase Docker memory limit in Docker Desktop settings
```
</details>

---

## 🌍 Internationalization

| Language | Code | URL Prefix |
|----------|------|------------|
| English | en | `/en/` |
| Français | fr | `/fr/` |
| Deutsch | de | `/de/` |
| Español | es | `/es/` |
| Italiano | it | `/it/` |

---

## 🗺️ Roadmap

See [CHANGELOG.md](docs/development/changelog.md) for detailed roadmap and planned features.

### Upcoming Features

- **Casting from UI** - Direct Chromecast integration
- **Metrics & Monitoring** - Per-task resource tracking
- **PWA Support** - Installable web app
- **Advanced Queue Management** - Priorities, retry, batch optimization
- **Cloud Storage Integration** - Native S3, GCS, Azure support
- **Email Notifications** - Conversion completion alerts
- **Multi-format Export** - MP4, WebM support

---

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](https://voldardard.github.io/mkv2castUI/development/contributing.html).

```bash
# 1. Fork & clone
git clone https://github.com/YOUR_USERNAME/mkv2castUI.git

# 2. Create branch
git checkout -b feature/amazing-feature

# 3. Make changes & test
make test  # Run all tests

# 4. Submit PR
```

---

## 📄 License

Copyright (c) 2026 mkv2cast Project

Licensed under the **Business Source License 1.1** (BSL 1.1).

- ✅ **Free for personal use** - Use, modify, self-host freely
- ⚠️ **Commercial SaaS requires license** - Contact us for commercial use
- 🔓 **Open source in 2030** - Converts to Apache 2.0 on Jan 1, 2030

**Commercial licensing**: [license@mkv2cast.io](mailto:license@mkv2cast.io)

See [LICENSE](LICENSE) for full text.

---

## 🔗 Related Projects

| Project | Description | Links |
|---------|-------------|-------|
| **mkv2cast** | CLI video converter | [GitHub](https://github.com/voldardard/mkv2cast) · [PyPI](https://pypi.org/project/mkv2cast/) · [Docs](https://voldardard.github.io/mkv2cast/) |
| **catt** | Cast videos to Chromecast | [GitHub](https://github.com/skorokithakis/catt) |

---

## 📊 Project Stats

- **Backend**: Django 5.0, DRF, Channels, Celery
- **Frontend**: Next.js 14, React 18, TailwindCSS
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Container**: Docker, Docker Compose
- **CI/CD**: GitHub Actions
- **Docs**: Sphinx + GitHub Pages

---

<p align="center">
  Made with ❤️ by the mkv2cast team
  <br>
  <a href="https://github.com/voldardard/mkv2castUI">GitHub</a> ·
  <a href="https://voldardard.github.io/mkv2castUI/">Documentation</a> ·
  <a href="https://github.com/voldardard/mkv2castUI/issues">Issues</a>
</p>
