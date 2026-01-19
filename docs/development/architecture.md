# Architecture

Technical overview of mkv2castUI's architecture.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   React UI      │  │   WebSocket     │  │   File Upload   │  │
│  │   (Next.js)     │  │   Client        │  │   (Dropzone)    │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
└───────────┼─────────────────────┼─────────────────────┼──────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌───────────────────────────────────────────────────────────────────┐
│                         Nginx (Port 8080)                         │
│                     Reverse Proxy / Load Balancer                 │
└───────────────────────────────────────────────────────────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
     ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
     │  Frontend    │      │   Daphne     │      │   Backend    │
     │  (Next.js)   │      │  (WebSocket) │      │   (Django)   │
     │  Port 3000   │      │  Port 8001   │      │  Port 8000   │
     └──────────────┘      └──────┬───────┘      └──────┬───────┘
                                  │                     │
                                  └──────────┬──────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
                    ▼                        ▼                        ▼
             ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
             │   Redis      │        │  PostgreSQL  │        │   Celery     │
             │   (Cache)    │        │  (Database)  │        │  (Workers)   │
             │  Port 6379   │        │  Port 5432   │        │              │
             └──────────────┘        └──────────────┘        └──────────────┘
                    │                                               │
                    │                                               │
                    └──────────────────────┬────────────────────────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │  mkv2cast    │
                                    │  (FFmpeg)    │
                                    └──────────────┘
```

## Components

### Frontend (Next.js 14)

**Technology Stack:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- TailwindCSS
- NextAuth.js
- TanStack Query

**Key Features:**
- Server-side rendering for SEO
- Client-side navigation
- Real-time updates via WebSocket
- Responsive design
- Internationalization (i18n)

**Directory Structure:**
```
frontend/src/
├── app/                    # App Router pages
│   ├── [lang]/            # Localized routes
│   │   ├── page.tsx       # Home/convert page
│   │   ├── history/       # History page
│   │   ├── docs/          # Documentation
│   │   └── admin/         # Admin panel
│   └── api/               # API routes (NextAuth)
├── components/            # React components
├── hooks/                 # Custom hooks
├── lib/                   # Utilities
└── types/                 # TypeScript types
```

### Backend (Django 5)

**Technology Stack:**
- Django 5.0
- Django REST Framework
- Django Channels (WebSocket)
- Celery (Background tasks)
- PostgreSQL
- Redis

**Key Features:**
- RESTful API
- WebSocket for real-time updates
- JWT authentication
- OAuth 2.0 integration
- Admin panel

**Directory Structure:**
```
backend/
├── accounts/              # User authentication
│   ├── models.py         # User model
│   ├── views.py          # Auth endpoints
│   ├── authentication.py # JWT handling
│   └── totp.py           # 2FA support
├── conversions/           # Video conversion
│   ├── models.py         # Job model
│   ├── views.py          # API endpoints
│   ├── tasks.py          # Celery tasks
│   └── consumers.py      # WebSocket handlers
└── mkv2cast_api/          # Django project
    ├── settings.py       # Configuration
    ├── urls.py           # URL routing
    ├── celery.py         # Celery config
    └── asgi.py           # ASGI config
```

### Celery Workers

**Purpose:** Handle video conversion in background

**Flow:**
1. API receives upload request
2. Creates ConversionJob in database
3. Queues Celery task
4. Worker picks up task
5. Runs mkv2cast conversion
6. Updates progress via Redis → WebSocket
7. Marks job complete

### WebSocket (Daphne)

**Purpose:** Real-time progress updates

**Channels:**
- `/ws/conversion/{job_id}/` - Single job progress
- `/ws/jobs/` - All user jobs updates

**Message Flow:**
```
Celery Worker → Redis (channel layer) → Daphne → WebSocket → Browser
```

## Data Flow

### File Upload

```
1. User drops file
2. Frontend chunks file (if large)
3. POST /api/upload/ with multipart
4. Django saves to media storage
5. Creates ConversionJob(status='pending')
6. Queues Celery task
7. Returns job ID
8. Frontend connects to WebSocket
```

### Conversion Process

```
1. Celery worker dequeues task
2. Updates job status to 'analyzing'
3. mkv2cast analyzes streams
4. Sends analysis via WebSocket
5. Updates job status to 'processing'
6. mkv2cast converts video
7. Sends progress updates (every second)
8. Conversion completes
9. Updates job status to 'completed'
10. Final WebSocket message
```

### Authentication Flow (OAuth)

```
1. User clicks "Sign in with Google"
2. Redirect to Google OAuth
3. Google redirects to callback
4. NextAuth exchanges code for tokens
5. Backend creates/updates user
6. Session cookie set
7. User authenticated
```

## Database Schema

### User Model

```python
class User(AbstractUser):
    email = EmailField(unique=True)
    totp_secret = CharField(null=True)  # 2FA
    is_admin = BooleanField(default=False)
    oauth_provider = CharField(null=True)
    oauth_id = CharField(null=True)
```

### ConversionJob Model

```python
class ConversionJob(Model):
    id = UUIDField(primary_key=True)
    user = ForeignKey(User)
    filename = CharField()
    status = CharField(choices=STATUS_CHOICES)
    progress = IntegerField(default=0)
    
    # Files
    input_file = FileField()
    output_file = FileField(null=True)
    
    # Options
    options = JSONField()
    
    # Metadata
    created_at = DateTimeField(auto_now_add=True)
    completed_at = DateTimeField(null=True)
    
    # Analysis
    streams = JSONField(null=True)
    
    # Stats
    input_size = BigIntegerField(null=True)
    output_size = BigIntegerField(null=True)
```

## Scaling Considerations

### Horizontal Scaling

**Workers:**
```bash
docker-compose up -d --scale celery=4
```

**Load Balancing:**
- Nginx upstream for multiple backend instances
- Sticky sessions for WebSocket

### Storage

**Local:** Docker volumes (default)
**S3:** For distributed deployments

### Caching

**Redis uses:**
- Session cache
- Celery broker
- Channel layer
- Result backend

## Security

### Authentication

- OAuth 2.0 (Google, GitHub)
- JWT tokens
- TOTP 2FA
- Session management

### API Security

- CSRF protection
- Rate limiting
- Input validation
- SQL injection prevention

### File Security

- File type validation
- Size limits
- Secure file names
- Isolated storage

## Monitoring

### Metrics

- API response times
- Conversion queue depth
- Worker utilization
- Error rates

### Logging

- Structured JSON logs
- Request/response logging
- Error tracking

### Health Checks

- `/health/` - API health
- Container health checks
- Database connectivity
- Redis connectivity
