# SSL/TLS Configuration

Secure mkv2castUI with HTTPS.

## Let's Encrypt (Recommended)

### Standalone (Simple)

```bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone \
  -d mkv2cast.example.com \
  -d www.mkv2cast.example.com
```

Certificates are saved to:
- `/etc/letsencrypt/live/mkv2cast.example.com/fullchain.pem`
- `/etc/letsencrypt/live/mkv2cast.example.com/privkey.pem`

### With Docker

Create `nginx/ssl/` directory and mount certificates:

```yaml
# docker-compose.yml
nginx:
  volumes:
    - /etc/letsencrypt:/etc/letsencrypt:ro
```

### Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Add cron job
echo "0 0,12 * * * root certbot renew --quiet" | sudo tee /etc/cron.d/certbot-renew
```

## Nginx SSL Configuration

```nginx
server {
    listen 80;
    server_name mkv2cast.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mkv2cast.example.com;

    # Certificates
    ssl_certificate /etc/letsencrypt/live/mkv2cast.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mkv2cast.example.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # ... rest of configuration
}
```

## Traefik (Kubernetes)

### With cert-manager

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: traefik
```

### Ingress Annotation

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - mkv2cast.example.com
      secretName: mkv2cast-tls
```

## Self-Signed Certificates (Development)

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/CN=localhost"
```

```{warning}
Self-signed certificates will show browser warnings. Only use for development.
```

## WebSocket over TLS (WSS)

Ensure nginx proxies WebSocket correctly:

```nginx
location /ws/ {
    proxy_pass http://daphne:8001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
}
```

## Verification

### Test SSL Configuration

```bash
# Check certificate
openssl s_client -connect mkv2cast.example.com:443 -servername mkv2cast.example.com

# Test with SSL Labs
# Visit: https://www.ssllabs.com/ssltest/
```

### Check HSTS

```bash
curl -I https://mkv2cast.example.com | grep -i strict
```

## Troubleshooting

### Certificate Not Trusted

- Ensure full chain is provided
- Check certificate expiration
- Verify domain matches certificate

### Mixed Content

- Update all URLs to HTTPS
- Check `NEXTAUTH_URL` uses https://

### WebSocket Connection Failed

- Verify nginx upgrade headers
- Check firewall allows 443
- Test with wscat: `wscat -c wss://mkv2cast.example.com/ws/jobs/`
