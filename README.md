# mkv2castUI

[![Tests](https://github.com/voldardard/mkv2castUI/actions/workflows/tests.yml/badge.svg)](https://github.com/voldardard/mkv2castUI/actions/workflows/tests.yml)
[![Documentation](https://github.com/voldardard/mkv2castUI/actions/workflows/docs.yml/badge.svg)](https://voldardard.github.io/mkv2castUI/)
[![License: BSL 1.1](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![Node 20+](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

> **BETA SOFTWARE (v0.1.0-beta)** - This software is under active development. APIs and features may change.

Web UI for [mkv2cast](https://pypi.org/project/mkv2cast/) - Smart MKV to Chromecast-compatible converter.

📖 **[Full Documentation](https://voldardard.github.io/mkv2castUI/)** | 🐍 **[mkv2cast CLI Docs](https://voldardard.github.io/mkv2cast/)** | 📦 **[PyPI](https://pypi.org/project/mkv2cast/)**

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
- **⚡ Hardware Acceleration** - VAAPI/QSV for blazing fast encoding
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

---

## 🚀 Quick Start

### Prerequisites

- Docker 20.10+ & Docker Compose v2+
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
docker-compose build
docker-compose up -d

# 4. Open http://localhost:8080
```

That's it! 🎉

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

---

## ⚙️ Configuration

All settings via environment variables. See [full configuration docs](https://voldardard.github.io/mkv2castUI/getting-started/configuration.html).

### Essential Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `REQUIRE_AUTH` | Enable OAuth authentication | `true` |
| `DJANGO_SECRET_KEY` | Django secret key | **Required** |
| `POSTGRES_PASSWORD` | Database password | **Required** |
| `MKV2CAST_DEFAULT_HW` | Hardware backend (`auto`/`cpu`/`vaapi`/`qsv`) | `auto` |
| `MKV2CAST_DEFAULT_CRF` | Video quality (0-51, lower=better) | `23` |
| `MKV2CAST_MAX_FILE_SIZE` | Max upload size (bytes) | 10GB |

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

> **Note for NVENC**: You need to install [nvidia-docker2](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) and add the NVIDIA runtime to your docker-compose.yml.

---

## 🔄 Updating / Upgrading

### Automatic Migrations

Database migrations run **automatically** when the backend container starts. No manual intervention needed for schema updates.

### Update Procedure

**From Source (docker-compose build):**

```bash
# 1. Stop services
docker-compose down

# 2. Pull latest code
git pull origin main

# 3. Rebuild containers
docker-compose build --no-cache

# 4. Start services (migrations run automatically)
docker-compose up -d

# 5. Check logs for migration status
docker-compose logs backend | grep -i migrate
```

**Using Pre-built Images (from GHCR):**

```bash
# 1. Stop services
docker-compose down

# 2. Pull latest images
docker-compose -f docker-compose.prod.yml pull

# 3. Start services (migrations run automatically)
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Migration (if needed)

If you need to manually run migrations:

```bash
docker-compose exec backend python manage.py migrate
```

---

## 👤 Creating Admin User

### Using the CLI Command

Create your first admin user with full access to the admin panel:

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

**Examples:**

```bash
# Create basic admin
docker-compose exec backend python manage.py createadminuser \
  --username admin --email admin@mycompany.com --password 'SecurePass!'

# Create admin with full name
docker-compose exec backend python manage.py createadminuser \
  --username john.doe --email john@example.com --password 'MyPassword123' \
  --first-name John --last-name Doe

# Update existing admin password
docker-compose exec backend python manage.py createadminuser \
  --username admin --email admin@example.com --password 'NewPassword456' \
  --update
```

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

### CI/CD

Tests run automatically on GitHub Actions:
- ✅ Backend tests with PostgreSQL & Redis services
- ✅ Frontend tests with coverage
- ✅ E2E tests with Docker Compose
- ✅ Security scanning with Trivy
- ✅ Build verification

---

## 📦 Distribution & Deployment

### Docker Compose (Recommended)

```bash
# Development
docker-compose up -d

# Production (with SSL)
docker-compose -f docker-compose.prod.yml up -d
```

### Docker Images

```bash
# Build images
docker-compose build

# Tag and push (example)
docker tag mkv2castui-frontend:latest your-registry/mkv2castui-frontend:v0.1.0
docker push your-registry/mkv2castui-frontend:v0.1.0
```

### Kubernetes / Helm

Helm charts available in the [docs/deployment](https://voldardard.github.io/mkv2castUI/deployment/kubernetes.html).

### Manual Installation

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
gunicorn mkv2cast_api.wsgi:application
```

**Frontend:**
```bash
cd frontend
npm install
npm run build
npm start
```

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

See [full API documentation](https://voldardard.github.io/mkv2castUI/api/rest-api.html).

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
```
</details>

<details>
<summary><strong>VAAPI not working</strong></summary>

```bash
# Check VAAPI in container
docker-compose exec celery vainfo

# Check device permissions
ls -la /dev/dri/

# Explicit device
MKV2CAST_VAAPI_DEVICE=/dev/dri/renderD128
```
</details>

<details>
<summary><strong>WebSocket connection failed</strong></summary>

```bash
# Check Daphne
docker-compose logs daphne

# Check nginx routing
docker-compose logs nginx
```
</details>

<details>
<summary><strong>Upload fails</strong></summary>

```bash
# Increase max file size
MKV2CAST_MAX_FILE_SIZE=21474836480  # 20GB

# Check nginx client_max_body_size
```
</details>

---

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](https://voldardard.github.io/mkv2castUI/development/contributing.html).

```bash
# 1. Fork & clone
git clone https://github.com/YOUR_USERNAME/mkv2castUI.git

# 2. Create branch
git checkout -b feature/amazing-feature

# 3. Make changes & test
pytest  # backend
npm test  # frontend

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
