# Conversion History

The History page shows all your past and current conversion jobs.

## Accessing History

1. Click **History** in the navigation menu
2. Or navigate to `/{lang}/history`

## Job List

The history displays all jobs with:

| Column | Description |
|--------|-------------|
| **Filename** | Original file name |
| **Status** | Current status with icon |
| **Progress** | Percentage (for active jobs) |
| **Created** | When job was started |
| **Size** | Input → Output size |
| **Actions** | Download, cancel, delete |

## Job Statuses

| Status | Icon | Description |
|--------|------|-------------|
| Pending | ⏳ | Waiting in queue |
| Analyzing | 🔍 | Examining streams |
| Processing | ⚙️ | Transcoding in progress |
| Completed | ✅ | Ready for download |
| Failed | ❌ | Error occurred |
| Cancelled | 🚫 | User cancelled |

## Actions

### Download

For completed jobs:
- Click the **Download** button
- File downloads immediately

### Cancel

For pending or processing jobs:
- Click **Cancel** to stop the job
- Partial output files are deleted

### Delete

For any job:
- Click **Delete** to remove from history
- Deletes input and output files
- Cannot be undone

## Filtering

Filter jobs by status:
- All
- Active (pending, processing)
- Completed
- Failed

## Sorting

Sort by:
- Date (newest/oldest)
- Filename
- Status

## Job Details

Click on a job to see details:

### Stream Analysis

```
Video:  HEVC 1920x1080 → H.264 (transcode)
Audio:  DTS 5.1 48kHz → AAC (transcode)
Audio:  AAC 2.0 48kHz → AAC (copy)
Subs:   SRT English → SRT (copy)
```

### Conversion Stats

| Stat | Value |
|------|-------|
| Duration | 1h 45m |
| Speed | 2.5x realtime |
| Input Size | 8.2 GB |
| Output Size | 4.1 GB |
| Compression | 50% |

### Options Used

Shows all options applied:
- Container: MKV
- Hardware: VAAPI
- CRF: 20
- Preset: slow
- Audio Bitrate: 192k

## Automatic Cleanup

By default, completed jobs are kept for 7 days.

Configure cleanup:
```bash
# In .env
MKV2CAST_JOB_RETENTION_DAYS=30
```

## API Access

Query history via API:

```bash
# List all jobs
curl http://localhost:8080/en/api/jobs/

# Filter by status
curl http://localhost:8080/en/api/jobs/?status=completed

# Get specific job
curl http://localhost:8080/en/api/jobs/{job_id}/
```

See {doc}`/api/rest-api` for full API reference.

## WebSocket Updates

History page receives real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:8080/ws/jobs/');

ws.onmessage = (event) => {
  const { type, job } = JSON.parse(event.data);
  // Update job in list
};
```
