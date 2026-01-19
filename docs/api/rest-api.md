# REST API Reference

mkv2castUI provides a comprehensive REST API for programmatic access to all features.

## Base URL

```
http://your-server:8080/{lang}/api/
```

Where `{lang}` is a supported language code: `en`, `fr`, `de`, `es`, `it`.

## Authentication

### Local Mode

When `REQUIRE_AUTH=false`, no authentication is required.

### OAuth Mode

When `REQUIRE_AUTH=true`, include the session cookie or Bearer token:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/en/api/jobs/
```

## Endpoints

### Jobs

#### List Jobs

```http
GET /{lang}/api/jobs/
```

**Response:**
```json
{
  "count": 10,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "filename": "movie.mkv",
      "status": "completed",
      "progress": 100,
      "created_at": "2026-01-19T10:30:00Z",
      "completed_at": "2026-01-19T10:45:00Z",
      "output_filename": "movie_chromecast.mkv",
      "file_size": 1073741824,
      "output_size": 943718400
    }
  ]
}
```

#### Create Job

```http
POST /{lang}/api/jobs/
```

**Request Body (multipart/form-data):**
| Field | Type | Description |
|-------|------|-------------|
| `file` | File | The MKV file to convert |
| `container` | string | Output container (`mkv` or `mp4`) |
| `hw_backend` | string | Hardware backend (`auto`, `cpu`, `vaapi`, `qsv`) |
| `preset` | string | Encoding preset (`ultrafast` to `veryslow`) |
| `crf` | integer | Quality (0-51, lower is better) |
| `audio_bitrate` | string | Audio bitrate (e.g., `192k`) |
| `force_h264` | boolean | Force H.264 encoding |
| `allow_hevc` | boolean | Allow HEVC if compatible |
| `force_aac` | boolean | Force AAC audio |
| `keep_surround` | boolean | Keep surround audio channels |
| `integrity_check` | boolean | Verify source file |
| `deep_check` | boolean | Full decode verification |

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "movie.mkv",
  "status": "pending",
  "progress": 0,
  "created_at": "2026-01-19T10:30:00Z"
}
```

#### Get Job Details

```http
GET /{lang}/api/jobs/{id}/
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "movie.mkv",
  "status": "processing",
  "progress": 45,
  "current_stage": "transcoding",
  "eta_seconds": 120,
  "speed": "2.5x",
  "created_at": "2026-01-19T10:30:00Z",
  "options": {
    "container": "mkv",
    "hw_backend": "vaapi",
    "crf": 20
  },
  "streams": {
    "video": {
      "codec": "hevc",
      "action": "transcode",
      "target_codec": "h264"
    },
    "audio": {
      "codec": "dts",
      "action": "transcode",
      "target_codec": "aac"
    }
  }
}
```

#### Cancel Job

```http
POST /{lang}/api/jobs/{id}/cancel/
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "cancelled"
}
```

#### Delete Job

```http
DELETE /{lang}/api/jobs/{id}/
```

**Response:** `204 No Content`

#### Download Converted File

```http
GET /{lang}/api/jobs/{id}/download/
```

**Response:** File download (application/octet-stream)

### Upload

#### Upload File

```http
POST /{lang}/api/upload/
```

Same as Create Job endpoint. Prefer using `/api/jobs/` for consistency.

### Options

#### Get Available Options

```http
GET /{lang}/api/options/
```

**Response:**
```json
{
  "containers": ["mkv", "mp4"],
  "hw_backends": [
    {"value": "auto", "label": "Auto", "available": true},
    {"value": "cpu", "label": "CPU", "available": true},
    {"value": "vaapi", "label": "VAAPI", "available": true},
    {"value": "qsv", "label": "Intel QSV", "available": false}
  ],
  "presets": ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"],
  "audio_bitrates": ["96k", "128k", "192k", "256k", "320k"],
  "defaults": {
    "container": "mkv",
    "hw_backend": "auto",
    "crf": 23,
    "preset": "medium",
    "audio_bitrate": "192k"
  },
  "max_file_size": 10737418240
}
```

### Statistics

#### Get User Statistics

```http
GET /{lang}/api/stats/
```

**Response:**
```json
{
  "total_jobs": 42,
  "completed_jobs": 38,
  "failed_jobs": 2,
  "cancelled_jobs": 2,
  "total_input_size": 107374182400,
  "total_output_size": 85899345920,
  "total_time_saved": 3600,
  "average_compression": 0.8
}
```

### Authentication Config

#### Get Auth Configuration

```http
GET /api/auth/config/
```

**Response:**
```json
{
  "require_auth": true,
  "providers": ["google", "github"],
  "totp_enabled": true
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {}
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `not_found` | 404 | Resource not found |
| `validation_error` | 400 | Invalid request data |
| `unauthorized` | 401 | Authentication required |
| `forbidden` | 403 | Permission denied |
| `file_too_large` | 413 | File exceeds max size |
| `invalid_file_type` | 415 | Only MKV files allowed |
| `server_error` | 500 | Internal server error |

## Rate Limiting

API requests are rate-limited:

- **Anonymous**: 100 requests/hour
- **Authenticated**: 1000 requests/hour
- **Admin**: Unlimited

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705662000
```

## Pagination

List endpoints support pagination:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `page` | Page number | 1 |
| `page_size` | Items per page | 20 |

```http
GET /{lang}/api/jobs/?page=2&page_size=50
```

## Filtering

Jobs can be filtered:

| Parameter | Description |
|-----------|-------------|
| `status` | Filter by status (`pending`, `processing`, `completed`, `failed`, `cancelled`) |
| `created_after` | ISO 8601 datetime |
| `created_before` | ISO 8601 datetime |

```http
GET /{lang}/api/jobs/?status=completed&created_after=2026-01-01T00:00:00Z
```

## SDKs and Libraries

### Python

```python
import requests

class Mkv2CastClient:
    def __init__(self, base_url, token=None):
        self.base_url = base_url
        self.session = requests.Session()
        if token:
            self.session.headers['Authorization'] = f'Bearer {token}'
    
    def list_jobs(self, lang='en'):
        response = self.session.get(f'{self.base_url}/{lang}/api/jobs/')
        return response.json()
    
    def create_job(self, file_path, options=None, lang='en'):
        with open(file_path, 'rb') as f:
            response = self.session.post(
                f'{self.base_url}/{lang}/api/jobs/',
                files={'file': f},
                data=options or {}
            )
        return response.json()
```

### JavaScript

```javascript
class Mkv2CastClient {
  constructor(baseUrl, token = null) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async listJobs(lang = 'en') {
    const response = await fetch(`${this.baseUrl}/${lang}/api/jobs/`, {
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    });
    return response.json();
  }

  async createJob(file, options = {}, lang = 'en') {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(options).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const response = await fetch(`${this.baseUrl}/${lang}/api/jobs/`, {
      method: 'POST',
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      body: formData,
    });
    return response.json();
  }
}
```
