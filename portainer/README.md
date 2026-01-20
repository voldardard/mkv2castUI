# Portainer Stacks for mkv2castUI

This directory contains Portainer stack files for easy deployment of mkv2castUI.

## Files

- **`stack.yml`** - Development stack with MinIO included
- **`stack-prod.yml`** - Production stack using external S3 storage
- **`app-template.json`** - Portainer app template for one-click deployment

## Quick Start

### Using Stack File

1. Open Portainer
2. Go to **Stacks** > **Add Stack**
3. Name: `mkv2castui`
4. Build method: **Web editor**
5. Copy contents from `stack.yml` or `stack-prod.yml`
6. Configure environment variables
7. Click **Deploy the stack**

### Using App Template

1. Import `app-template.json` into Portainer
2. Go to **App Templates**
3. Select **mkv2castUI**
4. Fill in environment variables
5. Deploy

### Using Git Repository

1. Go to **Stacks** > **Add Stack**
2. Select **Repository**
3. Repository URL: `https://github.com/voldardard/mkv2castUI`
4. Compose path: `portainer/stack.yml`
5. Configure and deploy

## Configuration

### Required Variables

```yaml
DJANGO_SECRET_KEY: "generate-with-openssl-rand-hex-32"
POSTGRES_PASSWORD: "your-secure-password"
DJANGO_ALLOWED_HOSTS: "localhost,your-domain.com"
```

### Optional Variables

See `app-template.json` for all available variables and their descriptions.

## Documentation

For detailed instructions, see:
- [Portainer Deployment Guide](../docs/deployment/portainer.md)
- [Main Deployment Guide](../DEPLOYMENT.md)

## Support

- **Documentation**: https://voldardard.github.io/mkv2castUI/
- **GitHub**: https://github.com/voldardard/mkv2castUI
- **Issues**: https://github.com/voldardard/mkv2castUI/issues
