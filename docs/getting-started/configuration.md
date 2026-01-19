# Configuration

mkv2castUI is configured through environment variables. This guide covers all available options.

## Environment File

Copy the example environment file and customize it:

```bash
cp .env.example .env
nano .env
```

## Application Settings

### Authentication Mode

| Variable | Description | Default |
|----------|-------------|---------|
| `REQUIRE_AUTH` | Enable OAuth authentication | `true` |

**Local Mode** (no authentication):
```bash
REQUIRE_AUTH=false
```

**Production Mode** (with OAuth):
```bash
REQUIRE_AUTH=true
```

## Django Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `DJANGO_SECRET_KEY` | Cryptographic signing key | **Required** |
| `DJANGO_DEBUG` | Enable debug mode | `False` |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated allowed hosts | `localhost,127.0.0.1` |
| `DJANGO_TIME_ZONE` | Server timezone | `UTC` |
| `DJANGO_LANGUAGE_CODE` | Default language | `en-us` |

```{warning}
Never enable `DJANGO_DEBUG=True` in production!
```

### Generating a Secret Key

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## Database Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_DB` | Database name | `mkv2cast` |
| `POSTGRES_USER` | Database user | `mkv2cast` |
| `POSTGRES_PASSWORD` | Database password | **Required** |
| `DATABASE_URL` | Full connection URL | Auto-generated |

Example:
```bash
POSTGRES_DB=mkv2cast
POSTGRES_USER=mkv2cast
POSTGRES_PASSWORD=your_secure_password
DATABASE_URL=postgres://mkv2cast:your_secure_password@postgres:5432/mkv2cast
```

## Redis & Celery

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection URL | `redis://redis:6379/0` |
| `CELERY_BROKER_URL` | Celery broker URL | Same as `REDIS_URL` |
| `CELERY_RESULT_BACKEND` | Celery results backend | Same as `REDIS_URL` |
| `CELERY_WORKER_CONCURRENCY` | Number of worker processes | `2` |

```{tip}
Increase `CELERY_WORKER_CONCURRENCY` for better throughput on multi-core systems, but be aware of memory usage.
```

## OAuth Configuration

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Configure OAuth consent screen
5. Create OAuth 2.0 credentials

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |

### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Authorization callback URL to `https://your-domain/api/auth/callback/github`

| Variable | Description |
|----------|-------------|
| `GITHUB_CLIENT_ID` | OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | OAuth App client secret |

## Frontend (Next.js)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXTAUTH_URL` | Public application URL | `http://localhost:8080` |
| `NEXTAUTH_SECRET` | NextAuth.js secret | **Required** |
| `NEXT_PUBLIC_API_URL` | API base URL | `/api` |
| `NEXT_PUBLIC_WS_URL` | WebSocket base URL | `/ws` |

### Generating NextAuth Secret

```bash
openssl rand -base64 32
```

## mkv2cast / FFmpeg Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `MKV2CAST_DEFAULT_HW` | Hardware backend | `auto` |
| `MKV2CAST_VAAPI_DEVICE` | VAAPI device path | Auto-detect |
| `MKV2CAST_DEFAULT_CRF` | Video quality (0-51) | `23` |
| `MKV2CAST_DEFAULT_PRESET` | Encoding preset | `medium` |
| `MKV2CAST_DEFAULT_VAAPI_QP` | VAAPI quality | `23` |
| `MKV2CAST_DEFAULT_QSV_QUALITY` | QSV quality | `23` |
| `MKV2CAST_DEFAULT_AUDIO_BITRATE` | Audio bitrate | `192k` |
| `MKV2CAST_MAX_FILE_SIZE` | Max upload (bytes) | `10737418240` (10GB) |

### Hardware Backend Options

- `auto` - Automatically detect best available
- `cpu` - Software encoding (x264/x265)
- `vaapi` - VAAPI (Intel/AMD GPU)
- `qsv` - Intel Quick Sync Video

### Quality Settings

Lower CRF = better quality, larger file:

| CRF | Quality | Use Case |
|-----|---------|----------|
| 18 | Visually lossless | Archival |
| 20-22 | High quality | Recommended |
| 23 | Default | Good balance |
| 26-28 | Lower quality | Smaller files |

## Storage Configuration

### Local Storage (Default)

Files are stored in Docker volumes by default.

### S3-Compatible Storage

| Variable | Description | Default |
|----------|-------------|---------|
| `USE_S3` | Enable S3 storage | `false` |
| `S3_ENDPOINT` | S3 endpoint URL | - |
| `S3_ACCESS_KEY` | S3 access key | - |
| `S3_SECRET_KEY` | S3 secret key | - |
| `S3_BUCKET_NAME` | S3 bucket name | `mkv2cast` |
| `S3_REGION` | S3 region | `us-east-1` |

Works with:
- AWS S3
- MinIO
- DigitalOcean Spaces
- Backblaze B2
- Any S3-compatible storage

## Gunicorn Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `GUNICORN_WORKERS` | Number of workers | `4` |
| `GUNICORN_TIMEOUT` | Request timeout (sec) | `120` |

```{tip}
Rule of thumb: `workers = (2 × CPU cores) + 1`
```

## Example Configurations

### Minimal Local Setup

```bash
# .env
REQUIRE_AUTH=false
DJANGO_SECRET_KEY=your-secret-key-here
POSTGRES_PASSWORD=your-db-password
```

### Production Setup

```bash
# .env
REQUIRE_AUTH=true
DJANGO_SECRET_KEY=your-very-long-and-secure-secret-key
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=your-domain.com,www.your-domain.com

POSTGRES_DB=mkv2cast
POSTGRES_USER=mkv2cast
POSTGRES_PASSWORD=very-secure-database-password

REDIS_URL=redis://redis:6379/0

NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-nextauth-secret

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

MKV2CAST_DEFAULT_HW=vaapi
MKV2CAST_DEFAULT_CRF=20
MKV2CAST_MAX_FILE_SIZE=21474836480

GUNICORN_WORKERS=8
CELERY_WORKER_CONCURRENCY=4
```

## Next Steps

- {doc}`quickstart` - Start using mkv2castUI
- {doc}`/deployment/docker` - Production deployment
- {doc}`/admin/authentication` - Configure authentication
