# Hardware Acceleration

Hardware acceleration dramatically speeds up video encoding by offloading work to your GPU.

## Overview

| Backend | Technology | Speed | Quality | Compatibility |
|---------|------------|-------|---------|---------------|
| CPU | libx264 | ⭐ | ⭐⭐⭐⭐⭐ | All systems |
| VAAPI | Intel/AMD | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Intel 6th+, AMD GCN+ |
| QSV | Intel Quick Sync | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Intel 4th+ |

## VAAPI (Video Acceleration API)

### Supported Hardware

**Intel:**
- 6th gen (Skylake) and newer
- Integrated graphics (HD, UHD, Iris)

**AMD:**
- GCN architecture and newer
- Radeon RX, Vega, RDNA series

### Setup

1. **Verify GPU access:**
```bash
ls -la /dev/dri/
# Should show: card0, renderD128 (or similar)
```

2. **Check docker-compose.yml includes:**
```yaml
celery:
  devices:
    - /dev/dri:/dev/dri
```

3. **Configure in .env:**
```bash
MKV2CAST_DEFAULT_HW=vaapi
# Optional: specify device
MKV2CAST_VAAPI_DEVICE=/dev/dri/renderD128
```

### Verification

```bash
# Check VAAPI availability in container
docker-compose exec celery vainfo

# Expected output includes:
# vainfo: VA-API version: 1.18 (libva 2.18.0)
# vainfo: Driver version: Intel iHD driver...
# vainfo: Supported profile and entrypoints
#   VAProfileH264Main               : VAEntrypointEncSlice
#   VAProfileH264High               : VAEntrypointEncSlice
#   VAProfileHEVCMain               : VAEntrypointEncSlice
```

### Troubleshooting

**"No VAAPI device"**
```bash
# Check device exists
ls -la /dev/dri/

# Check permissions
groups

# Add user to video/render groups
sudo usermod -aG video,render $USER
```

**"Failed to create VA display"**
```bash
# Install drivers (Ubuntu/Debian)
sudo apt install intel-media-va-driver-non-free  # Intel
sudo apt install mesa-va-drivers  # AMD

# Verify
vainfo
```

## Intel Quick Sync (QSV)

### Supported Hardware

- Intel 4th gen (Haswell) and newer
- Requires Intel Media SDK / oneVPL

### Setup

1. **Install Intel drivers on host:**
```bash
# Ubuntu/Debian
sudo apt install intel-media-va-driver-non-free libmfx1

# Arch Linux
pacman -S intel-media-driver libmfx
```

2. **Configure in .env:**
```bash
MKV2CAST_DEFAULT_HW=qsv
```

3. **Ensure device access:**
```yaml
# docker-compose.yml
celery:
  devices:
    - /dev/dri:/dev/dri
```

### Verification

```bash
# In container
docker-compose exec celery vainfo

# Look for QSV profiles:
# VAProfileH264Main : VAEntrypointFEI
```

## CPU Encoding (Software)

### When to Use

- No compatible GPU
- Maximum quality required
- Troubleshooting hardware issues

### Configuration

```bash
MKV2CAST_DEFAULT_HW=cpu
```

### Optimization

CPU encoding benefits from multiple cores:

```bash
# Increase Celery workers for parallel jobs
CELERY_WORKER_CONCURRENCY=4

# Or use faster presets
MKV2CAST_DEFAULT_PRESET=fast
```

## Auto Detection

When `MKV2CAST_DEFAULT_HW=auto`:

1. Check for VAAPI
2. Check for QSV
3. Fall back to CPU

Logs show which encoder is selected:
```
[INFO] Hardware detection: VAAPI available
[INFO] Using VAAPI encoder on /dev/dri/renderD128
```

## Quality Comparison

### Same CRF, Different Backends

| Backend | Time | Size | VMAF Score |
|---------|------|------|------------|
| CPU (slow) | 100% | 100% | 95.5 |
| CPU (medium) | 60% | 105% | 95.0 |
| VAAPI | 25% | 108% | 94.5 |
| QSV | 20% | 110% | 94.0 |

*Benchmark: 1080p, 2-hour movie, CRF 20*

### Recommendations

| Scenario | Backend | Preset/Quality |
|----------|---------|----------------|
| Quality archival | CPU | slow, CRF 18 |
| Daily use | VAAPI/QSV | CRF 20 |
| Batch processing | QSV | CRF 22 |
| Quick preview | VAAPI | CRF 26 |

## Docker GPU Passthrough

### Intel

```yaml
celery:
  devices:
    - /dev/dri:/dev/dri
  group_add:
    - video
    - render
```

### AMD

```yaml
celery:
  devices:
    - /dev/dri:/dev/dri
    - /dev/kfd:/dev/kfd
  group_add:
    - video
    - render
```

### NVIDIA (Not Currently Supported)

NVENC support is planned but not yet implemented. Use CPU or Intel/AMD for now.

## Performance Tuning

### VAAPI Quality

```bash
# Lower = better quality, range 0-51
MKV2CAST_DEFAULT_VAAPI_QP=20
```

### QSV Quality

```bash
# Lower = better quality
MKV2CAST_DEFAULT_QSV_QUALITY=20
```

### Memory Considerations

Hardware encoding uses less RAM than CPU:

| Backend | RAM per 1080p Job |
|---------|-------------------|
| CPU | ~2GB |
| VAAPI | ~500MB |
| QSV | ~400MB |

## Monitoring

### GPU Usage (Intel)

```bash
# Install intel-gpu-tools
sudo apt install intel-gpu-tools

# Monitor
sudo intel_gpu_top
```

### GPU Usage (AMD)

```bash
# Install radeontop
sudo apt install radeontop

# Monitor
radeontop
```

### Container Stats

```bash
docker stats mkv2cast-celery
```
