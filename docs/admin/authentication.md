# Authentication Administration

Configure and manage authentication for mkv2castUI.

## Authentication Modes

### Local Mode

No authentication required. Best for:
- Personal use
- Air-gapped environments
- Development

```bash
# .env
REQUIRE_AUTH=false
```

### OAuth Mode

OAuth 2.0 authentication with optional 2FA. Best for:
- Multi-user deployments
- Public-facing instances
- Enterprise environments

```bash
# .env
REQUIRE_AUTH=true
```

## OAuth Provider Setup

### Google

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project or select existing
3. Navigate to APIs & Services → Credentials
4. Create OAuth 2.0 Client ID
5. Set authorized redirect URI: `https://your-domain.com/api/auth/callback/google`

```bash
# .env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### GitHub

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create new OAuth App
3. Set callback URL: `https://your-domain.com/api/auth/callback/github`

```bash
# .env
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

## User Management

### Admin Panel

Access the admin panel at `/{lang}/admin` (admin users only).

Features:
- View all users
- Promote/demote admins
- Disable accounts
- View usage statistics

### Create Admin User

```bash
# Via Django admin
docker-compose exec backend python manage.py createsuperuser

# Or via shell
docker-compose exec backend python manage.py shell
>>> from accounts.models import User
>>> user = User.objects.get(email='admin@example.com')
>>> user.is_admin = True
>>> user.save()
```

### Reset User Password

```bash
docker-compose exec backend python manage.py changepassword username
```

## Two-Factor Authentication (2FA)

### Enable 2FA Globally

2FA is always available for users to enable. To require 2FA for all users:

```python
# backend/accounts/settings.py
REQUIRE_2FA = True
```

### 2FA Recovery

If user loses 2FA device:

1. Admin can disable 2FA:
```bash
docker-compose exec backend python manage.py shell
>>> from accounts.models import User
>>> user = User.objects.get(email='user@example.com')
>>> user.totp_secret = None
>>> user.save()
```

2. Or use backup codes (provided at 2FA setup)

## Session Management

### Session Duration

```bash
# .env
SESSION_COOKIE_AGE=86400  # 24 hours (default)
```

### Force Logout All Users

```bash
docker-compose exec backend python manage.py clearsessions
```

## API Tokens

### Token Expiration

```python
# backend/mkv2cast_api/settings.py
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}
```

### Revoke All Tokens

```bash
docker-compose exec backend python manage.py shell
>>> from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
>>> OutstandingToken.objects.all().delete()
```

## Rate Limiting

Protect against brute force:

```python
# backend/accounts/throttling.py
LOGIN_THROTTLE_RATE = '5/minute'
API_THROTTLE_RATE = '1000/hour'
```

## Audit Logging

Enable login audit:

```bash
# .env
AUDIT_LOG_ENABLED=true
```

View logs:
```bash
docker-compose exec backend python manage.py shell
>>> from accounts.models import AuditLog
>>> AuditLog.objects.filter(action='login').order_by('-timestamp')[:10]
```

## LDAP/Active Directory

Enterprise feature (planned). Contact us for early access.

## Security Best Practices

1. **Use HTTPS** - Always in production
2. **Enable 2FA** - For admin accounts
3. **Regular audits** - Review user access
4. **Strong secrets** - Generate random keys
5. **Update regularly** - Keep dependencies current
