# Changelog

All notable changes to mkv2castUI are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Documentation pages in React frontend
- Sphinx documentation with GitHub Pages deployment
- Multi-language support for documentation pages
- On-Premise deployment guide
- Features comparison page

### Changed
- Improved README with test results and badges
- Enhanced Header component with documentation dropdown

## [0.1.0-beta] - 2026-01-19

### Added
- **Core Features**
  - MKV file upload with drag & drop
  - Video conversion using mkv2cast
  - Real-time progress tracking via WebSocket
  - Hardware acceleration (VAAPI, QSV, CPU)
  - Smart stream analysis
  
- **Authentication**
  - OAuth 2.0 support (Google, GitHub)
  - Two-factor authentication (TOTP)
  - Local mode (no auth required)
  - JWT token authentication
  
- **User Interface**
  - Next.js 14 React frontend
  - Responsive design with TailwindCSS
  - Dark theme
  - Internationalization (EN, FR, DE, ES, IT)
  
- **Backend**
  - Django 5 REST API
  - Celery background workers
  - PostgreSQL database
  - Redis cache
  
- **DevOps**
  - Docker Compose configuration
  - Nginx reverse proxy
  - Health checks
  - GitHub Actions CI/CD

### Infrastructure
- PostgreSQL 16 for database
- Redis 7 for caching and message broker
- Daphne for WebSocket server
- Gunicorn for WSGI server

## Versioning

### Version Format

`MAJOR.MINOR.PATCH[-PRERELEASE]`

- **MAJOR**: Breaking API changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes
- **PRERELEASE**: alpha, beta, rc

### Release Schedule

- **Beta releases**: Every 2-4 weeks
- **Stable release**: Q2 2026 (planned)

## Upgrade Guide

### From 0.1.0-alpha to 0.1.0-beta

1. Backup database:
```bash
docker-compose exec postgres pg_dump -U mkv2cast mkv2cast > backup.sql
```

2. Pull latest changes:
```bash
git pull origin main
```

3. Rebuild containers:
```bash
docker-compose build
```

4. Apply migrations:
```bash
docker-compose up -d
docker-compose exec backend python manage.py migrate
```

## Deprecations

No deprecations in current beta version.

## Security Updates

Security updates are released as patch versions. Subscribe to GitHub security advisories for notifications.
