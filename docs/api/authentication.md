# API Authentication

This guide covers authentication methods for the mkv2castUI API.

## Authentication Modes

mkv2castUI supports two authentication modes:

### Local Mode

When `REQUIRE_AUTH=false`:
- No authentication required
- All API endpoints accessible
- Ideal for self-hosted, single-user setups

### OAuth Mode

When `REQUIRE_AUTH=true`:
- OAuth 2.0 authentication required
- Supports Google and GitHub providers
- Optional 2FA (TOTP)

## Getting the Auth Configuration

```http
GET /api/auth/config/
```

**Response:**
```json
{
  "require_auth": true,
  "providers": ["google", "github"],
  "totp_enabled": true,
  "local_auth": true
}
```

## OAuth Flow

### 1. Initiate OAuth

Redirect user to OAuth provider:

```
GET /api/auth/signin/google
GET /api/auth/signin/github
```

### 2. Handle Callback

After OAuth, user is redirected to:
```
/api/auth/callback/google
/api/auth/callback/github
```

### 3. Session Cookie

On success, a session cookie is set:
```
next-auth.session-token=...
```

## API Token Authentication

For programmatic access, use Bearer tokens:

### Get Token

After OAuth login, get an API token:

```http
POST /api/auth/token/
```

**Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "expires_in": 3600
}
```

### Use Token

Include in requests:

```http
GET /en/api/jobs/
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

### Refresh Token

Tokens expire after 1 hour. Refresh with:

```http
POST /api/auth/token/refresh/
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

## Two-Factor Authentication (2FA)

### Enable 2FA

```http
POST /api/auth/totp/enable/
```

**Response:**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qr_code": "data:image/png;base64,iVBORw0KGgo...",
  "backup_codes": [
    "12345678",
    "87654321",
    ...
  ]
}
```

### Verify 2FA Setup

```http
POST /api/auth/totp/verify/
Content-Type: application/json

{
  "code": "123456"
}
```

### 2FA Login

After password authentication:

```http
POST /api/auth/totp/login/
Content-Type: application/json

{
  "code": "123456"
}
```

### Disable 2FA

```http
DELETE /api/auth/totp/
Content-Type: application/json

{
  "code": "123456"
}
```

## Local User Authentication

For non-OAuth authentication:

### Register

```http
POST /api/auth/register/
Content-Type: application/json

{
  "username": "newuser",
  "email": "user@example.com",
  "password": "securepassword123"
}
```

### Login

```http
POST /api/auth/login/
Content-Type: application/json

{
  "username": "newuser",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "newuser",
    "email": "user@example.com",
    "is_admin": false
  }
}
```

### Logout

```http
POST /api/auth/logout/
Authorization: Bearer <token>
```

## Error Responses

### 401 Unauthorized

```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

### 403 Forbidden

```json
{
  "error": "forbidden",
  "message": "Insufficient permissions"
}
```

### 2FA Required

```json
{
  "error": "totp_required",
  "message": "Two-factor authentication required"
}
```

## Client Examples

### Python

```python
import requests

class Mkv2CastClient:
    def __init__(self, base_url):
        self.base_url = base_url
        self.session = requests.Session()
        self.token = None

    def login(self, username, password):
        response = self.session.post(
            f'{self.base_url}/api/auth/login/',
            json={'username': username, 'password': password}
        )
        data = response.json()
        self.token = data['access']
        self.session.headers['Authorization'] = f'Bearer {self.token}'
        return data

    def refresh_token(self, refresh_token):
        response = self.session.post(
            f'{self.base_url}/api/auth/token/refresh/',
            json={'refresh': refresh_token}
        )
        data = response.json()
        self.token = data['access']
        self.session.headers['Authorization'] = f'Bearer {self.token}'
        return data

# Usage
client = Mkv2CastClient('http://localhost:8080')
client.login('myuser', 'mypassword')
jobs = client.session.get('http://localhost:8080/en/api/jobs/').json()
```

### JavaScript

```javascript
class Mkv2CastClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.token = null;
  }

  async login(username, password) {
    const response = await fetch(`${this.baseUrl}/api/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    this.token = data.access;
    return data;
  }

  async request(endpoint, options = {}) {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${this.token}`,
    };
    return fetch(`${this.baseUrl}${endpoint}`, { ...options, headers });
  }
}

// Usage
const client = new Mkv2CastClient('http://localhost:8080');
await client.login('myuser', 'mypassword');
const jobs = await client.request('/en/api/jobs/').then(r => r.json());
```

## Security Best Practices

1. **Store tokens securely** - Use secure storage (keychain, encrypted storage)
2. **Rotate tokens** - Refresh tokens before expiry
3. **Use HTTPS** - Always use TLS in production
4. **Enable 2FA** - For sensitive accounts
5. **Limit token scope** - Use minimal permissions needed
