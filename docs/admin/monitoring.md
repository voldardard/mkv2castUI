# Monitoring

Monitor mkv2castUI health and performance.

## Health Endpoints

### API Health

```http
GET /api/health/
```

Response:
```json
{
  "status": "healthy",
  "database": "ok",
  "redis": "ok",
  "celery": "ok"
}
```

### Detailed Health

```http
GET /api/health/detailed/
```

Response:
```json
{
  "status": "healthy",
  "components": {
    "database": {
      "status": "ok",
      "latency_ms": 2
    },
    "redis": {
      "status": "ok",
      "latency_ms": 1
    },
    "celery": {
      "status": "ok",
      "workers": 4,
      "queue_depth": 2
    },
    "storage": {
      "status": "ok",
      "used_gb": 45.2,
      "free_gb": 154.8
    }
  }
}
```

## Docker Health Checks

Each container has health checks:

```yaml
# docker-compose.yml
backend:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8000/api/health/"]
    interval: 30s
    timeout: 10s
    retries: 3
```

Check status:
```bash
docker-compose ps
docker inspect mkv2cast-backend --format='{{.State.Health.Status}}'
```

## Logs

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 celery
```

### Log Levels

```bash
# .env
DJANGO_LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR
CELERY_LOG_LEVEL=INFO
```

### Structured Logging

Logs are JSON-formatted for easy parsing:

```json
{
  "timestamp": "2026-01-19T10:30:00Z",
  "level": "INFO",
  "service": "backend",
  "message": "Job completed",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "duration_seconds": 120
}
```

## Metrics (Prometheus)

### Enable Metrics

```bash
# .env
PROMETHEUS_METRICS=true
```

### Scrape Endpoint

```
http://localhost:8000/metrics/
```

### Available Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `mkv2cast_jobs_total` | Counter | Total jobs by status |
| `mkv2cast_job_duration_seconds` | Histogram | Job duration |
| `mkv2cast_queue_depth` | Gauge | Jobs in queue |
| `mkv2cast_active_workers` | Gauge | Active Celery workers |
| `mkv2cast_storage_bytes` | Gauge | Storage used |

### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'mkv2cast'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics/'
```

## Grafana Dashboard

Import dashboard from `docs/monitoring/grafana-dashboard.json`:

Panels include:
- Jobs per hour
- Average conversion time
- Queue depth
- Error rate
- Storage usage
- Worker CPU/Memory

## Alerts

### Prometheus Alertmanager

```yaml
# alerts.yml
groups:
  - name: mkv2cast
    rules:
      - alert: HighQueueDepth
        expr: mkv2cast_queue_depth > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High job queue depth"
          
      - alert: WorkerDown
        expr: mkv2cast_active_workers == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "No active workers"
          
      - alert: HighErrorRate
        expr: rate(mkv2cast_jobs_total{status="failed"}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High job failure rate"
```

## Resource Monitoring

### Container Stats

```bash
docker stats
```

### System Resources

```bash
# CPU/Memory
htop

# Disk I/O
iotop

# GPU (Intel)
intel_gpu_top
```

## Debugging

### Django Debug

```bash
# Enable debug mode (development only!)
DJANGO_DEBUG=True

# Access Django admin
http://localhost:8080/admin/
```

### Celery Debug

```bash
# Inspect workers
docker-compose exec celery celery -A mkv2cast_api inspect active

# Check queue
docker-compose exec celery celery -A mkv2cast_api inspect reserved

# Purge queue
docker-compose exec celery celery -A mkv2cast_api purge
```

### Redis Debug

```bash
# Connect to Redis
docker-compose exec redis redis-cli

# Check keys
KEYS *

# Queue length
LLEN celery
```
