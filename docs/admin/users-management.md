# User Management

Manage users in mkv2castUI.

## Admin Panel

Access the admin panel at `/{lang}/admin`.

### Requirements

- User must have `is_admin=True`
- Authentication must be enabled (`REQUIRE_AUTH=true`)

## User List

The admin panel shows all users with:

| Column | Description |
|--------|-------------|
| Username | Display name |
| Email | User email |
| Provider | OAuth provider (google/github/local) |
| Admin | Admin status |
| 2FA | Two-factor enabled |
| Jobs | Total conversions |
| Joined | Registration date |

## User Actions

### View User Details

Click on a user to see:
- Full profile
- Conversion history
- Usage statistics

### Promote to Admin

```bash
# Via admin panel: Click user → Toggle Admin

# Via CLI:
docker-compose exec backend python manage.py shell
>>> from accounts.models import User
>>> user = User.objects.get(email='user@example.com')
>>> user.is_admin = True
>>> user.save()
```

### Disable Account

Disabled users cannot:
- Log in
- Access API
- Start conversions

```bash
# Via admin panel: Click user → Disable

# Via CLI:
>>> user.is_active = False
>>> user.save()
```

### Delete User

```{warning}
Deleting a user also deletes all their conversion jobs and files.
```

```bash
# Via admin panel: Click user → Delete → Confirm

# Via CLI:
>>> user.delete()
```

## Bulk Operations

### Export Users

```bash
docker-compose exec backend python manage.py dumpdata accounts.User \
  --format json > users_backup.json
```

### Import Users

```bash
docker-compose exec backend python manage.py loaddata users_backup.json
```

## User Statistics

### Per User

```python
from conversions.models import ConversionJob

# Jobs count
ConversionJob.objects.filter(user=user).count()

# Total input size
ConversionJob.objects.filter(user=user).aggregate(Sum('input_size'))

# Completed jobs
ConversionJob.objects.filter(user=user, status='completed').count()
```

### Global

Admin dashboard shows:
- Total users
- Active users (last 30 days)
- Total conversions
- Storage used

## Quotas (Planned)

Future feature: per-user quotas for:
- Storage limit
- Concurrent jobs
- Monthly conversions

## API Endpoints

### List Users (Admin only)

```http
GET /api/admin/users/
Authorization: Bearer <admin-token>
```

### Get User

```http
GET /api/admin/users/{id}/
```

### Update User

```http
PATCH /api/admin/users/{id}/
Content-Type: application/json

{
  "is_admin": true
}
```

### Delete User

```http
DELETE /api/admin/users/{id}/
```
