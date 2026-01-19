# Quick Start Guide

## Option 1: Docker (Recommended - No Installation Issues)

```bash
# Clone the repository
git clone https://github.com/voldardard/mkv2castUI.git
cd mkv2castUI

# Copy and configure
cp .env.example .env
# Edit .env if needed (set REQUIRE_AUTH=false for local mode)

# Build and start
make build
make up

# Access at http://localhost:8080
```

**That's it!** No need to install Python, Node, or any dependencies.

## Option 2: Local Development

### Prerequisites (Arch Linux)

```bash
# Install system packages
sudo pacman -S python python-pip nodejs npm postgresql redis

# Install Pillow dependencies (if building from source)
sudo pacman -S libjpeg-turbo zlib libtiff freetype2 lcms2 libwebp openjpeg2

# Or use system Pillow (easier)
sudo pacman -S python-pillow
```

### Setup

```bash
# Install dependencies
make install

# Or manually:
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cd ../frontend
npm install
```

### Run

```bash
# Backend (terminal 1)
cd backend && source venv/bin/activate
export DATABASE_URL=sqlite:///db.sqlite3
export DJANGO_SECRET_KEY=dev-key
python manage.py migrate
python manage.py runserver

# Frontend (terminal 2)
cd frontend
npm run dev

# Celery (terminal 3)
cd backend && source venv/bin/activate
celery -A mkv2cast_api worker -l info
```

## Troubleshooting

### Pillow Installation Fails

**Problem:** `ERROR: Failed building wheel for Pillow`

**Solutions:**

1. **Use Docker (easiest):**
   ```bash
   make build && make up
   ```

2. **Use system Pillow:**
   ```bash
   sudo pacman -S python-pillow
   # Then edit requirements.txt to comment out Pillow line
   ```

3. **Install dev dependencies:**
   ```bash
   sudo pacman -S base-devel
   sudo pacman -S libjpeg-turbo zlib libtiff freetype2 lcms2 libwebp openjpeg2
   ```

### Database Connection Error

Use SQLite for local development:
```bash
export DATABASE_URL=sqlite:///db.sqlite3
```

## Next Steps

- Read [DEVELOPMENT.md](DEVELOPMENT.md) for detailed development guide
- Read [RELEASE.md](RELEASE.md) for release process
- Check [README.md](README.md) for full documentation
