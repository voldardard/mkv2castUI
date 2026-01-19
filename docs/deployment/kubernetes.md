# Kubernetes Deployment

Deploy mkv2castUI on Kubernetes for high availability and scalability.

## Prerequisites

- Kubernetes cluster (1.25+)
- kubectl configured
- Helm 3 (optional)

## Quick Start with kubectl

### 1. Create Namespace

```bash
kubectl create namespace mkv2cast
```

### 2. Create Secrets

```bash
kubectl create secret generic mkv2cast-secrets \
  --namespace mkv2cast \
  --from-literal=DJANGO_SECRET_KEY=$(openssl rand -hex 32) \
  --from-literal=POSTGRES_PASSWORD=$(openssl rand -hex 16) \
  --from-literal=NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

### 3. Apply Manifests

```bash
kubectl apply -f k8s/ -n mkv2cast
```

## Helm Chart

### Installation

```bash
# Add Helm repository
helm repo add mkv2cast https://voldardard.github.io/mkv2castUI/charts

# Install
helm install mkv2cast mkv2cast/mkv2castui \
  --namespace mkv2cast \
  --create-namespace \
  --values values.yaml
```

### values.yaml

```yaml
# Number of replicas
replicaCount:
  frontend: 2
  backend: 2
  celery: 4

# Image configuration
image:
  repository: ghcr.io/voldardard/mkv2castui
  tag: "0.1.0"
  pullPolicy: IfNotPresent

# Authentication
auth:
  requireAuth: true
  google:
    clientId: ""
    clientSecret: ""
  github:
    clientId: ""
    clientSecret: ""

# Database
postgresql:
  enabled: true
  auth:
    database: mkv2cast
    username: mkv2cast
    password: ""  # Will generate if empty

# Redis
redis:
  enabled: true
  architecture: standalone

# Storage
persistence:
  media:
    enabled: true
    size: 100Gi
    storageClass: ""  # Use default

# Ingress
ingress:
  enabled: true
  className: nginx
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "20g"
  hosts:
    - host: mkv2cast.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: mkv2cast-tls
      hosts:
        - mkv2cast.example.com

# Resources
resources:
  backend:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 250m
      memory: 256Mi
  celery:
    limits:
      cpu: 4000m
      memory: 4Gi
    requests:
      cpu: 1000m
      memory: 1Gi

# GPU for hardware acceleration
gpu:
  enabled: false
  # Intel GPU
  intel:
    enabled: true
    resourceName: gpu.intel.com/i915
```

## Manual Manifests

### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mkv2cast-config
  namespace: mkv2cast
data:
  REQUIRE_AUTH: "true"
  DJANGO_ALLOWED_HOSTS: "mkv2cast.example.com"
  MKV2CAST_DEFAULT_HW: "auto"
  MKV2CAST_DEFAULT_CRF: "23"
```

### Deployment (Backend)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mkv2cast-backend
  namespace: mkv2cast
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mkv2cast-backend
  template:
    metadata:
      labels:
        app: mkv2cast-backend
    spec:
      containers:
        - name: backend
          image: ghcr.io/voldardard/mkv2castui-backend:0.1.0
          ports:
            - containerPort: 8000
          envFrom:
            - configMapRef:
                name: mkv2cast-config
            - secretRef:
                name: mkv2cast-secrets
          resources:
            limits:
              cpu: 1000m
              memory: 1Gi
          readinessProbe:
            httpGet:
              path: /api/health/
              port: 8000
            initialDelaySeconds: 10
          livenessProbe:
            httpGet:
              path: /api/health/
              port: 8000
            initialDelaySeconds: 30
```

### Deployment (Celery Worker)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mkv2cast-celery
  namespace: mkv2cast
spec:
  replicas: 4
  selector:
    matchLabels:
      app: mkv2cast-celery
  template:
    metadata:
      labels:
        app: mkv2cast-celery
    spec:
      containers:
        - name: celery
          image: ghcr.io/voldardard/mkv2castui-backend:0.1.0
          command: ["celery", "-A", "mkv2cast_api", "worker", "-l", "info"]
          envFrom:
            - configMapRef:
                name: mkv2cast-config
            - secretRef:
                name: mkv2cast-secrets
          resources:
            limits:
              cpu: 4000m
              memory: 4Gi
              gpu.intel.com/i915: 1  # Intel GPU
          volumeMounts:
            - name: media
              mountPath: /app/media
            - name: dri
              mountPath: /dev/dri
      volumes:
        - name: media
          persistentVolumeClaim:
            claimName: mkv2cast-media
        - name: dri
          hostPath:
            path: /dev/dri
```

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mkv2cast-backend
  namespace: mkv2cast
spec:
  selector:
    app: mkv2cast-backend
  ports:
    - port: 8000
      targetPort: 8000
```

### Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mkv2cast-ingress
  namespace: mkv2cast
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "20g"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - mkv2cast.example.com
      secretName: mkv2cast-tls
  rules:
    - host: mkv2cast.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: mkv2cast-frontend
                port:
                  number: 3000
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: mkv2cast-backend
                port:
                  number: 8000
          - path: /ws
            pathType: Prefix
            backend:
              service:
                name: mkv2cast-daphne
                port:
                  number: 8001
```

## Scaling

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mkv2cast-celery-hpa
  namespace: mkv2cast
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mkv2cast-celery
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Monitoring

### ServiceMonitor (Prometheus)

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: mkv2cast
  namespace: mkv2cast
spec:
  selector:
    matchLabels:
      app: mkv2cast-backend
  endpoints:
    - port: http
      path: /metrics/
```

## Backup

Use Velero for backup:

```bash
velero backup create mkv2cast-backup \
  --include-namespaces mkv2cast \
  --include-resources pvc,secret,configmap
```
