# Installation

This guide covers the different ways to install and deploy mkv2castUI.

## Prerequisites

Before installing mkv2castUI, ensure you have:

- **Docker** 20.10 or later
- **Docker Compose** v2.0 or later
- **Git** (for cloning the repository)
- At least **4GB RAM** (8GB recommended for encoding)
- At least **20GB disk space** (more for video files)

### Optional: Hardware Acceleration

For hardware-accelerated encoding:

- **Intel GPU** (6th gen or later) for VAAPI/QSV
- **AMD GPU** (GCN or later) for VAAPI
- Proper drivers installed on the host system

## Installation Methods

### Docker Compose (Recommended)

The easiest way to deploy mkv2castUI:

```bash
# Clone the repository
git clone https://github.com/voldardard/mkv2castUI.git
cd mkv2castUI

# Copy the environment template
cp .env.example .env

# Edit configuration
nano .env
```

See {doc}`configuration` for detailed environment variable options.

```bash
# Build all containers
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

The application will be available at `http://localhost:8080`.

### Docker (Manual)

If you prefer to manage containers individually:

```bash
# Create network
docker network create mkv2cast-network

# Start PostgreSQL
docker run -d --name mkv2cast-postgres \
  --network mkv2cast-network \
  -e POSTGRES_DB=mkv2cast \
  -e POSTGRES_USER=mkv2cast \
  -e POSTGRES_PASSWORD=secure_password \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:16-alpine

# Start Redis
docker run -d --name mkv2cast-redis \
  --network mkv2cast-network \
  -v redis_data:/data \
  redis:7-alpine

# Build and run backend, frontend, etc.
# (See docker-compose.yml for full configuration)
```

### Development Setup

For local development without Docker:

#### Backend (Django)

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Setup database (using SQLite for development)
export DATABASE_URL=sqlite:///db.sqlite3
export DJANGO_SECRET_KEY=dev-secret-key
export DJANGO_DEBUG=True

# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

#### Frontend (Next.js)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

#### Celery Worker

```bash
cd backend
source venv/bin/activate

# Start Celery worker
celery -A mkv2cast_api worker -l info
```

## Verifying Installation

### Check Services

```bash
# Check all containers are running
docker-compose ps

# Expected output:
# NAME                 STATUS
# mkv2cast-backend     running
# mkv2cast-celery      running
# mkv2cast-daphne      running
# mkv2cast-frontend    running
# mkv2cast-nginx       running
# mkv2cast-postgres    running
# mkv2cast-redis       running
```

### Health Check

```bash
# Check API health
curl http://localhost:8080/api/health/

# Check frontend
curl -I http://localhost:8080/
```

### Hardware Acceleration

```bash
# Check VAAPI availability in worker
docker-compose exec celery vainfo

# Expected output includes:
# vainfo: VA-API version: X.XX
# vainfo: Driver version: Intel iHD driver
```

## Creating Admin User

After installation, create an administrator user to access the admin panel:

```bash
# Create admin user with CLI command
docker-compose exec backend python manage.py createadminuser \
  --username admin \
  --email admin@example.com \
  --password 'YourSecurePassword123!'
```

**Full options:**

| Option | Required | Description |
|--------|----------|-------------|
| `--username` | Yes | Admin username |
| `--email` | Yes | Admin email address |
| `--password` | Yes | Admin password (min 8 chars) |
| `--first-name` | No | First name (default: Admin) |
| `--last-name` | No | Last name (default: User) |
| `--no-superuser` | No | Create app admin only, not Django superuser |
| `--update` | No | Update existing user if username/email exists |

**Example with full details:**

```bash
docker-compose exec backend python manage.py createadminuser \
  --username john.doe \
  --email john@company.com \
  --password 'SecurePass123!' \
  --first-name John \
  --last-name Doe
```

Access the admin panel at `http://localhost:8080/{lang}/admin/` (e.g., `/en/admin/`).

## Upgrading

### Automatic Migrations

Database migrations run **automatically** when the backend container starts. No manual `migrate` command is needed during upgrades.

### Docker Compose (Recommended)

```bash
# 1. Stop services
docker-compose down

# 2. Pull latest changes
git pull origin main

# 3. Rebuild containers
docker-compose build --no-cache

# 4. Start services (migrations run automatically)
docker-compose up -d

# 5. Check logs for migration status
docker-compose logs backend | grep -i migrate
```

### Using Pre-built Images (GHCR)

```bash
# 1. Stop services
docker-compose down

# 2. Pull latest images
docker-compose -f docker-compose.prod.yml pull

# 3. Start services
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Migration (if needed)

If you need to manually run migrations:

```bash
docker-compose exec backend python manage.py migrate
```

## Uninstalling

### Docker Compose

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: deletes all data!)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

## Next Steps

- {doc}`configuration` - Configure mkv2castUI
- {doc}`quickstart` - Start converting videos
- {doc}`/deployment/docker` - Production deployment guide
