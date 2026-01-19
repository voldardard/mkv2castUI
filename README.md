# mkv2castUI

Web UI for [mkv2cast](https://github.com/voldardard/mkv2cast) - Smart MKV to Chromecast-compatible converter.

## Features

- **Upload & Convert**: Drag and drop MKV files for conversion
- **Real-time Progress**: WebSocket-based progress tracking
- **Hardware Acceleration**: Support for VAAPI, QSV, and CPU encoding
- **Multi-language**: Available in English, French, German, Spanish, and Italian
- **OAuth Authentication**: Sign in with Google or GitHub
- **Responsive Design**: Works on desktop and mobile devices
- **Subscription Tiers**: Free, Pro, and Enterprise plans with different limits

## Pricing Tiers

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Concurrent conversions | 1 | 5 | Unlimited |
| Max file size | 2 GB | 10 GB | 50 GB |
| Monthly conversions | 10 | 100 | Unlimited |
| Storage quota | 10 GB | 100 GB | 1 TB |
| Hardware acceleration | CPU only | VAAPI/QSV | VAAPI/QSV |
| Priority queue | - | - | Yes |
| Support | Community | Email | Dedicated |

## Architecture

```
mkv2castUI/
├── frontend/          # Next.js React application
├── backend/           # Django REST API + Celery workers
├── nginx/             # Reverse proxy configuration
└── docker-compose.yml # Docker orchestration
```

### Services

| Service | Description |
|---------|-------------|
| **nginx** | Reverse proxy, static files, WebSocket proxy |
| **frontend** | Next.js React UI |
| **backend** | Django REST API (Gunicorn) |
| **daphne** | WebSocket server (Django Channels) |
| **celery** | Background task workers |
| **postgres** | PostgreSQL database |
| **redis** | Cache & message broker |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- (Optional) VAAPI/QSV-capable GPU for hardware acceleration

### 1. Clone and Configure

```bash
git clone https://github.com/voldardard/mkv2castUI.git
cd mkv2castUI

# Copy and edit environment variables
cp .env.example .env
nano .env  # Edit with your settings
```

### 2. Configure OAuth (Optional)

For OAuth authentication, you need to set up OAuth applications:

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add `http://localhost:8080/accounts/google/login/callback/` to authorized redirect URIs

**GitHub OAuth:**
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set callback URL to `http://localhost:8080/accounts/github/login/callback/`

Add the credentials to your `.env` file.

### 3. Build and Run

```bash
# Build all containers
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 4. Access the Application

Open http://localhost:8080 in your browser.

## Development

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Running Celery Workers

```bash
cd backend
celery -A mkv2cast_api worker -l info
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/{lang}/api/jobs/` | GET | List user's jobs |
| `/{lang}/api/jobs/` | POST | Create new job |
| `/{lang}/api/jobs/{id}/` | GET | Get job details |
| `/{lang}/api/jobs/{id}/` | DELETE | Delete job |
| `/{lang}/api/jobs/{id}/cancel/` | POST | Cancel job |
| `/{lang}/api/jobs/{id}/download/` | GET | Download converted file |
| `/{lang}/api/upload/` | POST | Upload file for conversion |
| `/{lang}/api/options/` | GET | Get available options |
| `/{lang}/api/stats/` | GET | Get user statistics |

### WebSocket Endpoints

| Endpoint | Description |
|----------|-------------|
| `/ws/conversion/{job_id}/` | Real-time progress for a specific job |
| `/ws/jobs/` | Updates for all user's jobs |

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DJANGO_SECRET_KEY` | Django secret key | - |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | - |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | - |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | - |
| `USE_S3` | Use S3 for file storage | `false` |
| `MKV2CAST_DEFAULT_HW` | Default hardware backend | `auto` |

### Hardware Acceleration

For VAAPI support, ensure the Docker container has access to `/dev/dri`:

```yaml
# docker-compose.yml
celery:
  devices:
    - /dev/dri:/dev/dri
```

## Internationalization

Supported languages:
- English (`/en/`)
- Francais (`/fr/`)
- Deutsch (`/de/`)
- Espanol (`/es/`)
- Italiano (`/it/`)

## License

Copyright (c) 2026 mkv2cast Project

This software is licensed under the **Business Source License 1.1** (BSL 1.1).

### What this means:

- **Free for personal use**: You can use, modify, and self-host mkv2castUI for personal or internal business purposes at no cost.
- **Commercial SaaS requires a license**: If you want to offer video conversion as a service to third parties (a "Video Conversion Service"), you need a commercial license.
- **Open source in 2030**: On January 1, 2030, this software will be released under the Apache License 2.0.

### Commercial Licensing

For commercial licensing inquiries, please contact: **license@mkv2cast.io**

See [LICENSE](LICENSE) for full license text.

## Support

| Tier | Support Channel |
|------|-----------------|
| Free | [GitHub Issues](https://github.com/voldardard/mkv2castUI/issues) |
| Pro | Email support (support@mkv2cast.io) |
| Enterprise | Dedicated support with SLA |

## Contributing

We welcome contributions! However, by contributing, you agree that your contributions will be licensed under the same BSL 1.1 license.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Related Projects

- [mkv2cast](https://github.com/voldardard/mkv2cast) - CLI tool for video conversion
- [catt](https://github.com/skorokithakis/catt) - Cast videos to Chromecast
