# Converting Videos

This guide walks you through converting your MKV videos to Chromecast-compatible formats.

## Upload Your Video

### Drag and Drop

The easiest way to upload is drag and drop:

1. Open mkv2castUI in your browser
2. Drag your MKV file(s) onto the upload zone
3. Files appear in the "Selected Files" list

### Browse to Upload

Alternatively, click "browse to upload" to open a file picker.

### Supported Files

- **Format**: MKV (Matroska Video)
- **Max size**: 10GB (configurable via `MKV2CAST_MAX_FILE_SIZE`)

```{note}
Only MKV files are supported. Other formats (MP4, AVI, etc.) must first be remuxed to MKV.
```

## Configure Options

### Quick Options

For most users, the defaults work great:

| Option | Default | Description |
|--------|---------|-------------|
| Output Format | MKV | Chromecast-compatible MKV |
| Hardware | Auto | Best available encoder |
| Quality | 20 | High quality (CRF) |

### Output Format

- **MKV** - Recommended for Chromecast Ultra (supports more codecs)
- **MP4** - Better compatibility but fewer features

### Hardware Acceleration

- **Auto** - Automatically selects best available
- **CPU** - Software encoding (slowest, most compatible)
- **VAAPI** - Intel/AMD GPU acceleration
- **QSV** - Intel Quick Sync (fastest on Intel)

### Quality Preset

| Preset | CRF | Speed | File Size |
|--------|-----|-------|-----------|
| Fast | 26 | Fastest | Smallest |
| Balanced | 23 | Medium | Medium |
| Quality | 20 | Slowest | Largest |

## Advanced Options

Click "Show Advanced Options" for fine-grained control:

### Video Options

| Option | Description |
|--------|-------------|
| CRF (0-51) | Quality factor; lower = better quality |
| Preset | Encoding speed (ultrafast → veryslow) |
| Force H.264 | Always transcode to H.264 |
| Allow HEVC | Keep HEVC if device supports it |

### Audio Options

| Option | Description |
|--------|-------------|
| Audio Bitrate | Target bitrate (96k - 320k) |
| Force AAC | Always transcode to AAC |
| Keep Surround | Preserve 5.1/7.1 channels |

### Verification

| Option | Description |
|--------|-------------|
| Integrity Check | Verify source file before conversion |
| Deep Check | Full decode verification (slower) |

## Start Conversion

1. Review your selected files and options
2. Click **Start Conversion**
3. Watch the real-time progress

## Monitor Progress

The progress panel shows:

- **Status**: Current stage (analyzing, processing, completed)
- **Progress**: Percentage complete
- **ETA**: Estimated time remaining
- **Speed**: Encoding speed multiplier (e.g., "2.5x")

### Status Stages

| Stage | Description |
|-------|-------------|
| Pending | Job queued |
| Analyzing | Examining streams |
| Processing | Transcoding |
| Completed | Ready for download |
| Failed | Error occurred |
| Cancelled | User cancelled |

## Download Result

When conversion completes:

1. Click **Download** to save the file
2. Or right-click for more options:
   - Copy download link
   - Open in new tab

## Smart Analysis

mkv2castUI analyzes your video and only transcodes what's necessary:

### Example Analysis

```
Input: movie.mkv
├── Video: HEVC 1080p → Transcode to H.264
├── Audio: DTS 5.1 → Transcode to AAC
├── Audio: AAC 2.0 → Copy (already compatible)
└── Subtitles: SRT → Copy
```

### Actions

| Action | Meaning |
|--------|---------|
| **Copy** | Stream is compatible, no processing needed |
| **Transcode** | Stream needs conversion |

## Tips for Best Results

### Quality Settings

- **Movies**: CRF 18-20 for high quality
- **TV Shows**: CRF 20-23 for good balance
- **Streaming**: CRF 23-26 for smaller files

### Hardware Acceleration

- Enable VAAPI/QSV for 3-5x faster encoding
- Check GPU compatibility in container: `docker-compose exec celery vainfo`

### Large Files

- For files >4GB, ensure enough disk space
- Consider splitting very long videos

### Batch Processing

- Upload multiple files at once
- All files process sequentially
- Each uses the same options

## Troubleshooting

### Conversion Fails

Check Celery logs:
```bash
docker-compose logs celery
```

Common issues:
- Corrupted source file (enable Integrity Check)
- Unsupported codec
- Out of disk space

### Slow Encoding

- Enable hardware acceleration
- Use faster preset (trade quality for speed)
- Check CPU/GPU usage

### Quality Issues

- Lower CRF value (e.g., 18 instead of 23)
- Use slower preset
- Increase audio bitrate
