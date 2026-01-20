"""
Django settings for mkv2cast_api project.
"""
import os
from pathlib import Path

import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-dev-key-change-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DJANGO_DEBUG', 'True').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# Application definition
INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    # Third party
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'channels',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.github',
    # Local apps
    'accounts',
    'conversions',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]

ROOT_URLCONF = 'mkv2cast_api.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'mkv2cast_api.wsgi.application'
ASGI_APPLICATION = 'mkv2cast_api.asgi.application'

# Database
DATABASE_URL = os.environ.get('DATABASE_URL', f'sqlite:///{BASE_DIR / "db.sqlite3"}')
DATABASES = {
    'default': dj_database_url.parse(DATABASE_URL)
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'static'

# Media files
MEDIA_URL = '/media/'
# MEDIA_ROOT is only used for temporary files during conversion
# All persistent storage is on S3/MinIO
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom user model
AUTH_USER_MODEL = 'accounts.User'

# =============================================================================
# Django REST Framework
# =============================================================================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'accounts.authentication.OptionalAuthentication',
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'accounts.permissions.IsAuthenticatedOrAuthDisabled',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# =============================================================================
# CORS Settings
# =============================================================================
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080',
    'https://mkv2cast.io',
]
CORS_ALLOW_CREDENTIALS = True

# =============================================================================
# Django Channels (WebSocket)
# =============================================================================
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [REDIS_URL],
        },
    },
}

# =============================================================================
# Celery Configuration
# =============================================================================
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', REDIS_URL)
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', REDIS_URL)
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 86400  # 24 hours max per task

# =============================================================================
# Django Allauth (OAuth)
# =============================================================================
SITE_ID = 1

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]

ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_AUTHENTICATION_METHOD = 'email'
ACCOUNT_EMAIL_VERIFICATION = 'optional'
LOGIN_REDIRECT_URL = '/'
LOGOUT_REDIRECT_URL = '/'

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': ['profile', 'email'],
        'AUTH_PARAMS': {'access_type': 'online'},
        'APP': {
            'client_id': os.environ.get('GOOGLE_CLIENT_ID', ''),
            'secret': os.environ.get('GOOGLE_CLIENT_SECRET', ''),
        }
    },
    'github': {
        'SCOPE': ['user:email'],
        'APP': {
            'client_id': os.environ.get('GITHUB_CLIENT_ID', ''),
            'secret': os.environ.get('GITHUB_CLIENT_SECRET', ''),
        }
    },
}

# Custom adapters
ACCOUNT_ADAPTER = 'accounts.adapters.CustomAccountAdapter'
SOCIALACCOUNT_ADAPTER = 'accounts.adapters.CustomSocialAccountAdapter'

# =============================================================================
# Storage Configuration (Always S3/MinIO)
# =============================================================================
# Always use S3-compatible storage (MinIO local or external S3)
# Configuration is read dynamically from SiteSettings via custom storage backend
# Fallback to environment variables for initial setup

# Default values (used if SiteSettings not configured)
USE_S3 = os.environ.get('USE_S3', 'false').lower() in ('true', '1', 'yes')
MINIO_ENDPOINT = os.environ.get('MINIO_ENDPOINT', 'http://minio:9000')
MINIO_ACCESS_KEY = os.environ.get('MINIO_ACCESS_KEY', os.environ.get('MINIO_ROOT_USER', 'minioadmin'))
MINIO_SECRET_KEY = os.environ.get('MINIO_SECRET_KEY', os.environ.get('MINIO_ROOT_PASSWORD', 'minioadmin'))
MINIO_BUCKET_NAME = os.environ.get('MINIO_BUCKET_NAME', 'mkv2cast')

# S3 settings (for external S3 like Exoscale)
if USE_S3:
    AWS_ACCESS_KEY_ID = os.environ.get('S3_ACCESS_KEY')
    AWS_SECRET_ACCESS_KEY = os.environ.get('S3_SECRET_KEY')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'mkv2cast')
    AWS_S3_ENDPOINT_URL = os.environ.get('S3_ENDPOINT')
    AWS_S3_REGION_NAME = os.environ.get('S3_REGION', 'us-east-1')
else:
    # Default to MinIO local
    AWS_ACCESS_KEY_ID = MINIO_ACCESS_KEY
    AWS_SECRET_ACCESS_KEY = MINIO_SECRET_KEY
    AWS_STORAGE_BUCKET_NAME = MINIO_BUCKET_NAME
    AWS_S3_ENDPOINT_URL = MINIO_ENDPOINT
    AWS_S3_REGION_NAME = 'us-east-1'  # MinIO doesn't care about region

AWS_DEFAULT_ACL = None
AWS_S3_FILE_OVERWRITE = False
AWS_QUERYSTRING_AUTH = True
AWS_QUERYSTRING_EXPIRE = 3600  # 1 hour signed URLs (default, can be overridden in SiteSettings)

# Use custom storage backend that reads from SiteSettings dynamically
DEFAULT_FILE_STORAGE = 'accounts.storage_backend.DynamicS3Storage'

# =============================================================================
# mkv2cast Settings
# =============================================================================
MKV2CAST_DEFAULT_HW = os.environ.get('MKV2CAST_DEFAULT_HW', 'auto')

# VAAPI device - empty string means auto-detect
MKV2CAST_VAAPI_DEVICE = os.environ.get('MKV2CAST_VAAPI_DEVICE', '')

# Default encoding quality settings
MKV2CAST_DEFAULT_CRF = int(os.environ.get('MKV2CAST_DEFAULT_CRF', '23'))
MKV2CAST_DEFAULT_PRESET = os.environ.get('MKV2CAST_DEFAULT_PRESET', 'medium')
MKV2CAST_DEFAULT_VAAPI_QP = int(os.environ.get('MKV2CAST_DEFAULT_VAAPI_QP', '23'))
MKV2CAST_DEFAULT_QSV_QUALITY = int(os.environ.get('MKV2CAST_DEFAULT_QSV_QUALITY', '23'))
MKV2CAST_DEFAULT_AUDIO_BITRATE = os.environ.get('MKV2CAST_DEFAULT_AUDIO_BITRATE', '192k')

# Maximum file size for uploads (default 10GB)
MKV2CAST_MAX_FILE_SIZE = int(os.environ.get('MKV2CAST_MAX_FILE_SIZE', str(10 * 1024 * 1024 * 1024)))

# =============================================================================
# Authentication Mode
# =============================================================================
# When False, authentication is disabled and an anonymous local user is used
REQUIRE_AUTH = os.environ.get('REQUIRE_AUTH', 'true').lower() in ('true', '1', 'yes')

# =============================================================================
# File Upload Limits
# =============================================================================
DATA_UPLOAD_MAX_MEMORY_SIZE = 100 * 1024 * 1024  # 100MB in memory
FILE_UPLOAD_MAX_MEMORY_SIZE = 100 * 1024 * 1024  # 100MB

# =============================================================================
# Gunicorn Settings (used in docker-compose command)
# =============================================================================
GUNICORN_WORKERS = int(os.environ.get('GUNICORN_WORKERS', '4'))
GUNICORN_TIMEOUT = int(os.environ.get('GUNICORN_TIMEOUT', '120'))
