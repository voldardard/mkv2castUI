# mkv2castUI Documentation

```{image} _static/hero-banner.svg
:alt: mkv2castUI
:class: hero-banner
:align: center
```

**mkv2castUI** is a modern web interface for [mkv2cast](https://pypi.org/project/mkv2cast/), the intelligent MKV to Chromecast-compatible video converter.

```{admonition} Beta Software
:class: warning

mkv2castUI is currently in beta (v0.1.0-beta). APIs and features may change.
```

## Key Features

- **🚀 Hardware Acceleration** - VAAPI, Intel Quick Sync, and CPU encoding
- **🔍 Smart Analysis** - Only transcodes what's necessary
- **📊 Real-time Progress** - WebSocket-based live updates
- **🔐 Flexible Auth** - OAuth 2.0, 2FA, or no-auth local mode
- **🌍 Multi-language** - English, French, German, Spanish, Italian
- **🐳 Easy Deployment** - Docker Compose ready

## Quick Start

Get started in 5 minutes:

```bash
# Clone the repository
git clone https://github.com/voldardard/mkv2castUI.git
cd mkv2castUI

# Configure (local mode - no authentication)
cp .env.example .env
echo "REQUIRE_AUTH=false" >> .env

# Build and run
docker-compose build
docker-compose up -d

# Open http://localhost:8080
```

## Documentation Sections

```{toctree}
:maxdepth: 2
:caption: Getting Started

getting-started/installation
getting-started/configuration
getting-started/quickstart
```

```{toctree}
:maxdepth: 2
:caption: User Guide

user-guide/converting-videos
user-guide/conversion-options
user-guide/hardware-acceleration
user-guide/history
```

```{toctree}
:maxdepth: 2
:caption: Deployment

deployment/docker
deployment/kubernetes
deployment/storage
deployment/ssl-tls
```

```{toctree}
:maxdepth: 2
:caption: Administration

admin/authentication
admin/users-management
admin/monitoring
admin/backup
```

```{toctree}
:maxdepth: 2
:caption: API Reference

api/rest-api
api/websocket
api/authentication
```

```{toctree}
:maxdepth: 2
:caption: Development

development/architecture
development/contributing
development/testing
development/changelog
```

## Related Projects

- [mkv2cast CLI](https://github.com/voldardard/mkv2cast) - Command-line video converter
- [mkv2cast on PyPI](https://pypi.org/project/mkv2cast/) - Python package
- [mkv2cast Docs](https://voldardard.github.io/mkv2cast/) - CLI documentation

## Support

- **Issues**: [GitHub Issues](https://github.com/voldardard/mkv2castUI/issues)
- **Discussions**: [GitHub Discussions](https://github.com/voldardard/mkv2castUI/discussions)
- **Enterprise**: [enterprise@mkv2cast.io](mailto:enterprise@mkv2cast.io)

## Indices and tables

- {ref}`genindex`
- {ref}`search`
