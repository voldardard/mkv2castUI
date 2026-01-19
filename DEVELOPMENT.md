# Development Guide

## Development Setup Options

### Option 1: Docker (Recommended)

The easiest way to develop is using Docker:

```bash
# Build and start all services
make build
make up

# View logs
make logs

# Run tests in containers
docker-compose exec backend pytest
docker-compose exec frontend npm test
```

**Pros:**
- No need to install system dependencies
- Matches production environment
- Isolated from system Python/Node

### Option 2: Local Development

For local development without Docker:

#### Prerequisites

**Arch Linux:**
```bash
# Install Pillow dependencies
sudo pacman -S libjpeg-turbo zlib libtiff freetype2 lcms2 libwebp openjpeg

# Install Python and Node
sudo pacman -S python python-pip nodejs npm

# Install PostgreSQL and Redis (or use Docker for these)
sudo pacman -S postgresql redis
```

**Ubuntu/Debian:**
```bash
sudo apt-get install python3-dev python3-pip nodejs npm
sudo apt-get install libjpeg-dev zlib1g-dev libtiff-dev libfreetype6-dev liblcms2-dev libwebp-dev libopenjp2-7-dev
```

#### Setup

```bash
# Install all dependencies
make install

# Or manually:
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cd ../frontend
npm install
```

#### Running Locally

**Backend:**
```bash
cd backend
source venv/bin/activate
export DATABASE_URL=sqlite:///db.sqlite3
export DJANGO_SECRET_KEY=dev-secret-key
export DJANGO_DEBUG=True
python manage.py migrate
python manage.py runserver
```

**Frontend:**
```bash
cd frontend
npm run dev
```

**Celery (separate terminal):**
```bash
cd backend
source venv/bin/activate
celery -A mkv2cast_api worker -l info
```

## Common Issues

### Pillow Installation Fails

**Problem:** `ERROR: Failed building wheel for Pillow`

**Solution:**
1. Install system dependencies (see Prerequisites above)
2. Or use Docker: `make build && make up`

### Database Connection Error

**Problem:** `django.db.utils.OperationalError: could not connect to server`

**Solution:**
- Use SQLite for local dev: `export DATABASE_URL=sqlite:///db.sqlite3`
- Or start PostgreSQL: `sudo systemctl start postgresql`

### Port Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or change port in package.json
```

## Testing

### Run All Tests

```bash
make test
```

### Run Specific Tests

```bash
# Backend only
make test-backend

# Frontend only
make test-frontend

# E2E tests (requires Docker)
make test-e2e
```

## Code Quality

### Linting

```bash
make lint
```

### Formatting

```bash
make format
```

## Documentation

### Build Locally

```bash
make docs-build
# Open docs/_build/html/index.html
```

### Serve Locally

```bash
make docs-serve
# Open http://localhost:8000
```

## IDE Setup

### VS Code

Recommended extensions:
- Python
- ESLint
- Prettier
- Docker

### PyCharm

1. Mark `backend/` as Sources Root
2. Configure Django: Settings > Languages & Frameworks > Django
3. Enable Docker support

## Troubleshooting

### Virtual Environment Issues

```bash
# Recreate venv
cd backend
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Node Modules Issues

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Docker Issues

```bash
# Clean everything
make clean

# Rebuild
make build
```
