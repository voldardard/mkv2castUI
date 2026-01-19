# Conversion Options

Detailed reference for all mkv2castUI conversion options.

## Container Format

### MKV (Matroska)

- **Recommended** for Chromecast Ultra
- Supports more audio codecs
- Better subtitle handling
- Chapter support

### MP4

- Wider device compatibility
- Limited to AAC audio
- No subtitle streams (burned-in only)

## Hardware Acceleration

### Auto Detection

When set to `auto`, mkv2castUI checks for hardware in this order:

1. **NVENC** (NVIDIA GPU)
2. **VAAPI** (Intel/AMD GPU)
3. **QSV** (Intel Quick Sync)
4. **CPU** (software fallback)

### NVIDIA NVENC

**Supported GPUs:**
- GeForce GTX 600 series and newer
- Quadro/Tesla Kepler architecture and newer

**Pros:**
- Fastest encoding (3-8x faster than CPU)
- High quality with Turing+ architecture
- Excellent for batch processing

**Requirements:**
- NVIDIA driver 470+
- nvidia-docker2 runtime

**Configuration:**
```bash
MKV2CAST_DEFAULT_HW=nvenc

# Quality setting (CQ mode, 0-51, lower = better)
# Default: 23
```

**Docker configuration required:**
```yaml
# In docker-compose.yml, add to celery service:
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]
```

### VAAPI

**Supported GPUs:**
- Intel 6th gen (Skylake) and newer
- AMD GCN architecture and newer

**Pros:**
- 2-5x faster than CPU
- Low power consumption
- Good quality

**Configuration:**
```bash
MKV2CAST_DEFAULT_HW=vaapi
MKV2CAST_VAAPI_DEVICE=/dev/dri/renderD128
```

### Intel Quick Sync (QSV)

**Supported:**
- Intel 4th gen (Haswell) and newer

**Pros:**
- Fastest encoding
- Dedicated hardware encoder
- Excellent parallel performance

**Configuration:**
```bash
MKV2CAST_DEFAULT_HW=qsv
```

### CPU (Software)

**Uses:** libx264 / libx265

**Pros:**
- Best quality
- Most compatible
- No GPU required

**Cons:**
- Slowest option
- High CPU usage

## Quality Settings

### CRF (Constant Rate Factor)

Controls video quality. Lower = better quality, larger file.

| CRF | Quality | Use Case |
|-----|---------|----------|
| 0 | Lossless | Archival (huge files) |
| 15-17 | Near-lossless | Professional |
| 18-20 | High quality | Movies, archival |
| 21-23 | Good quality | General use |
| 24-26 | Medium | Streaming, storage |
| 27-30 | Lower | Mobile, limited storage |

**Recommendation:** Start with 20-22 for most content.

### Encoding Preset

Speed vs. compression efficiency tradeoff:

| Preset | Speed | Quality | File Size |
|--------|-------|---------|-----------|
| ultrafast | ⚡⚡⚡⚡⚡ | ⭐ | Largest |
| superfast | ⚡⚡⚡⚡ | ⭐⭐ | |
| veryfast | ⚡⚡⚡ | ⭐⭐ | |
| faster | ⚡⚡⚡ | ⭐⭐⭐ | |
| fast | ⚡⚡ | ⭐⭐⭐ | |
| medium | ⚡⚡ | ⭐⭐⭐⭐ | Default |
| slow | ⚡ | ⭐⭐⭐⭐ | |
| slower | ⚡ | ⭐⭐⭐⭐⭐ | |
| veryslow | 🐌 | ⭐⭐⭐⭐⭐ | Smallest |

**Recommendation:** Use `slow` for quality, `fast` for speed.

## Video Options

### Force H.264

Always transcode video to H.264, even if:
- Source is already H.264
- HEVC would be smaller

**When to use:**
- Maximum device compatibility
- Playback issues with source codec

### Allow HEVC

Keep HEVC video if the target device supports it.

**Chromecast support:**
- Chromecast Ultra: ✅ HEVC supported
- Chromecast 3rd gen: ❌ H.264 only
- Chromecast with Google TV: ✅ HEVC supported

## Audio Options

### Audio Bitrate

| Bitrate | Quality | Use Case |
|---------|---------|----------|
| 96k | Low | Voice, podcasts |
| 128k | Acceptable | Casual listening |
| 192k | Good | **Recommended** |
| 256k | High | Music, audiophile |
| 320k | Highest | Archival |

### Force AAC

Always transcode audio to AAC.

**Source codecs requiring transcoding:**
- DTS / DTS-HD
- TrueHD / Dolby Atmos
- FLAC
- PCM

**Already compatible (may copy):**
- AAC
- AC3 (Dolby Digital)
- E-AC3

### Keep Surround

Preserve surround sound channels (5.1, 7.1).

- **Enabled**: Keep original channel layout
- **Disabled**: Downmix to stereo

**Note:** Chromecast supports up to 5.1 surround via compatible AVR.

## Audio/Subtitle Selection

### Audio Language Priority

Select preferred audio track by language codes.

**Format:** Comma-separated ISO 639-2 codes

**Examples:**
```
fre,fra,eng     # French (any variant), then English
eng,und         # English, then undefined
jpn,eng         # Japanese, then English
```

**Common codes:**
| Language | Codes |
|----------|-------|
| English | `eng`, `en` |
| French | `fre`, `fra`, `fr` |
| German | `ger`, `deu`, `de` |
| Spanish | `spa`, `es` |
| Japanese | `jpn`, `ja` |

### Audio Track Index

Select audio track by explicit index (0-based).

- Overrides language selection
- Use when file has multiple tracks of same language

### Subtitle Language Priority

Select preferred subtitle track by language codes.

**Format:** Same as audio language

**Note:** Subtitles are embedded in MKV or burned-in for MP4.

### Subtitle Track Index

Select subtitle track by explicit index (0-based).

### Prefer Forced Subtitles

When enabled, prefers forced/sign subtitles in the audio language.

**Forced subtitles:** Only show when characters speak a different language.

**Useful for:**
- Anime with Japanese signs
- Movies with foreign dialogue
- Multi-language scenes

### Disable Subtitles

Remove all subtitle tracks from output.

**Use when:**
- Saving space
- Using external subtitles
- Device doesn't support embedded subs

## Optimization Options

### Skip if Compatible

Skip conversion if the source file is already Chromecast-compatible.

**Checks:**
- Video codec is H.264 (or HEVC if allowed)
- Audio codec is AAC/AC3
- Container is MKV or MP4

**Benefits:**
- Saves processing time
- Preserves original quality
- Reduces server load

**Disabled when:**
- You need to change container
- Specific quality settings required

### Keep Silence

Disable removal of silent audio segments.

- **Enabled**: Preserve silent segments as-is
- **Disabled**: May remove/compress silence

**Note:** Most conversions don't modify silence. This is a passthrough option from mkv2cast CLI.

## Verification Options

### Integrity Check

Quick verification of source file before processing.

**Checks:**
- File headers
- Container structure
- Stream metadata

**Recommended:** Always enabled (minimal overhead)

### Deep Check

Full decode verification of entire file.

**Checks:**
- Every frame decodes correctly
- No corruption in video/audio
- Timestamp consistency

**Use when:**
- Source is from unreliable source
- Previous conversion failed
- Archiving important content

**Note:** Significantly increases processing time.

## Default Configuration

Server-wide defaults can be set via environment variables:

```bash
# Quality defaults
MKV2CAST_DEFAULT_CRF=23
MKV2CAST_DEFAULT_PRESET=medium
MKV2CAST_DEFAULT_AUDIO_BITRATE=192k

# Hardware defaults
MKV2CAST_DEFAULT_HW=auto
MKV2CAST_VAAPI_DEVICE=

# VAAPI quality (when using VAAPI)
MKV2CAST_DEFAULT_VAAPI_QP=23

# QSV quality (when using QSV)
MKV2CAST_DEFAULT_QSV_QUALITY=23
```

## Option Combinations

### Archival Quality

```
Container: MKV
CRF: 18
Preset: slow
Audio: 256k
Integrity Check: ✅
```

### Fast Streaming

```
Container: MP4
CRF: 24
Preset: fast
Audio: 128k
Hardware: Auto
```

### Maximum Compatibility

```
Container: MP4
Force H.264: ✅
Force AAC: ✅
Keep Surround: ❌
CRF: 22
```

### Quality Preservation

```
Container: MKV
CRF: 20
Preset: slower
Allow HEVC: ✅
Keep Surround: ✅
Audio: 320k
```
