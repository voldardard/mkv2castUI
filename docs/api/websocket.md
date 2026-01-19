# WebSocket API Reference

mkv2castUI uses WebSocket connections for real-time updates on conversion progress.

## Connection

### Endpoint

```
ws://your-server:8080/ws/conversion/{job_id}/
wss://your-server:8080/ws/conversion/{job_id}/  # With SSL
```

### Connection Example

```javascript
const jobId = '550e8400-e29b-41d4-a716-446655440000';
const ws = new WebSocket(`ws://localhost:8080/ws/conversion/${jobId}/`);

ws.onopen = () => {
  console.log('Connected to conversion progress');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Progress:', data);
};

ws.onclose = () => {
  console.log('Disconnected');
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

## Message Types

### Progress Update

Sent during conversion:

```json
{
  "type": "progress",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "progress": 45.5,
  "stage": "transcoding",
  "eta_seconds": 120,
  "speed": "2.5x",
  "frame": 12345,
  "fps": 45.2,
  "size": 524288000,
  "time": "00:05:30.00",
  "bitrate": "8000kbits/s"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always `progress` |
| `job_id` | string | UUID of the job |
| `status` | string | Current status |
| `progress` | float | Percentage (0-100) |
| `stage` | string | Current stage |
| `eta_seconds` | integer | Estimated seconds remaining |
| `speed` | string | Encoding speed multiplier |
| `frame` | integer | Current frame number |
| `fps` | float | Frames per second |
| `size` | integer | Current output size (bytes) |
| `time` | string | Current position in video |
| `bitrate` | string | Current bitrate |

### Status Change

Sent when job status changes:

```json
{
  "type": "status",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "output_filename": "movie_chromecast.mkv",
  "output_size": 943718400,
  "duration": 900
}
```

### Analysis Complete

Sent after file analysis:

```json
{
  "type": "analysis",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "streams": {
    "video": {
      "codec": "hevc",
      "width": 1920,
      "height": 1080,
      "duration": 7200,
      "bitrate": 8000000,
      "action": "transcode",
      "target_codec": "h264"
    },
    "audio": [
      {
        "codec": "dts",
        "channels": 6,
        "sample_rate": 48000,
        "action": "transcode",
        "target_codec": "aac"
      },
      {
        "codec": "aac",
        "channels": 2,
        "sample_rate": 48000,
        "action": "copy"
      }
    ],
    "subtitle": [
      {
        "codec": "subrip",
        "language": "eng",
        "action": "copy"
      }
    ]
  }
}
```

### Error

Sent on error:

```json
{
  "type": "error",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "error": "ffmpeg_error",
  "message": "FFmpeg process exited with code 1",
  "details": "Error during encoding: No VAAPI device available"
}
```

## Jobs WebSocket

For updates on all user's jobs:

```
ws://your-server:8080/ws/jobs/
```

### Message Format

```json
{
  "type": "job_update",
  "job": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "filename": "movie.mkv",
    "status": "processing",
    "progress": 45.5
  }
}
```

## Reconnection

Implement automatic reconnection for reliability:

```javascript
class WebSocketClient {
  constructor(url, options = {}) {
    this.url = url;
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.reconnectAttempts = 0;
    this.handlers = {};
  }

  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      console.log('Connected');
      this.reconnectAttempts = 0;
      this.emit('open');
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.emit('message', data);
      this.emit(data.type, data);
    };
    
    this.ws.onclose = () => {
      console.log('Disconnected');
      this.emit('close');
      this.tryReconnect();
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };
  }

  tryReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connect(), this.reconnectInterval);
    }
  }

  on(event, handler) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(handler);
  }

  emit(event, data) {
    if (this.handlers[event]) {
      this.handlers[event].forEach(handler => handler(data));
    }
  }

  close() {
    this.maxReconnectAttempts = 0;
    this.ws.close();
  }
}

// Usage
const client = new WebSocketClient(`ws://localhost:8080/ws/conversion/${jobId}/`);

client.on('progress', (data) => {
  console.log(`Progress: ${data.progress}%`);
});

client.on('status', (data) => {
  if (data.status === 'completed') {
    console.log('Conversion complete!');
  }
});

client.connect();
```

## React Hook Example

```typescript
import { useEffect, useState, useCallback } from 'react';

interface ProgressData {
  type: string;
  job_id: string;
  status: string;
  progress: number;
  eta_seconds?: number;
  speed?: string;
}

export function useConversionProgress(jobId: string | null) {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    const ws = new WebSocket(`ws://${window.location.host}/ws/conversion/${jobId}/`);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setProgress(data);
    };

    return () => {
      ws.close();
    };
  }, [jobId]);

  return { progress, connected };
}

// Usage in component
function ConversionProgress({ jobId }) {
  const { progress, connected } = useConversionProgress(jobId);

  if (!connected) {
    return <div>Connecting...</div>;
  }

  return (
    <div>
      <div>Status: {progress?.status}</div>
      <div>Progress: {progress?.progress}%</div>
      <div>ETA: {progress?.eta_seconds} seconds</div>
    </div>
  );
}
```
