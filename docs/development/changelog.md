# Changelog

All notable changes to mkv2castUI are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0-beta] - 2026-01-XX

### Added

#### Documentation & Developer Experience
- **Comprehensive README** - Complete rewrite with all Docker options, Makefile commands, and deployment guides
- **Enhanced Docker Documentation** - Detailed guide covering all build options, Docker Compose commands, and hardware acceleration setup
- **Makefile Improvements** - Fixed version command output, added comprehensive help system
- **Build Documentation** - Complete reference for all Dockerfile build options and arguments
- **Command Reference** - Full documentation of all available Makefile commands

#### Docker & Build System
- **Production Docker Compose** - Separate `docker-compose.prod.yml` for production deployments using pre-built images
- **Multi-stage Frontend Build** - Optimized Docker build with separate builder and runner stages
- **Hardware Acceleration Documentation** - Complete guides for VAAPI, QSV, and NVIDIA NVENC setup
- **Volume Management** - Documentation for backup, restore, and volume operations
- **Service Scaling** - Guides for horizontal scaling of Celery workers and backend services

#### Configuration
- **Environment Variable Reference** - Complete documentation of all configuration options
- **Advanced Settings** - Documentation for Gunicorn workers, Celery concurrency, and encoding presets
- **S3-Compatible Storage** - Enhanced documentation for AWS S3, MinIO, Backblaze B2 integration
- **Hardware Backend Options** - Complete reference for all hardware acceleration modes

#### Developer Tools
- **Makefile Commands** - Comprehensive command set for development, testing, and deployment
  - `make version` - Show current version (fixed ANSI color output)
  - `make release` - Prepare release with version updates
  - `make release-push` - Automated release workflow
  - `make check` - Release readiness verification
  - `make migrations-check` - Database migration status
  - `make docs-build` / `make docs-serve` - Documentation building and serving

### Changed

#### Documentation
- **README Restructure** - Professional sections covering all aspects of the application
  - Complete Docker & Build Options section
  - Comprehensive Makefile Commands reference
  - Enhanced Troubleshooting section
  - Improved Architecture documentation
  - Better Quick Start guide
- **Docker Documentation** - Expanded with build options, commands, and hardware acceleration
- **Configuration Guide** - More detailed with examples and best practices

#### Build System
- **Version Display** - Fixed `make version` command to properly display ANSI colors
- **Release Process** - Improved release automation with better error checking

#### Code Quality
- **Linting & Formatting** - Enhanced Makefile targets for code quality checks
- **Test Organization** - Better test command structure in Makefile

### Fixed
- **Makefile Version Output** - Fixed ANSI color codes not being interpreted correctly in `make version` command
- **Documentation Links** - Improved internal documentation linking
- **Docker Compose Examples** - Corrected production deployment examples

### Improved
- **Developer Onboarding** - Much clearer documentation for new contributors
- **Deployment Guides** - More comprehensive production deployment instructions
- **Troubleshooting** - Expanded troubleshooting section with common issues and solutions
- **API Documentation** - Better organized API reference section

### Technical Details

#### Docker Improvements
- Better separation between development and production configurations
- Clearer documentation of all Docker Compose options
- Complete reference for all volume and network operations
- Hardware acceleration setup guides for all supported backends

#### Documentation Structure
- Professional README with table of contents
- Comprehensive Docker deployment guide
- Complete Makefile command reference
- Enhanced configuration documentation

---

## [0.1.0-beta] - 2026-01-19

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
