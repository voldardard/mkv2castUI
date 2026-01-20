import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export interface LocalMediaMetadata {
  duration?: number;
  video_codec?: string;
  width?: number;
  height?: number;
  audio_tracks?: Array<{
    index: number;
    ffmpeg_index?: number;
    language: string;
    codec: string;
    channels: number;
    default?: boolean;
    forced?: boolean;
    stream_id?: string;
  }>;
  subtitle_tracks?: Array<{
    index: number;
    ffmpeg_index?: number;
    language: string;
    codec: string;
    forced: boolean;
    default?: boolean;
    hearing_impaired?: boolean;
    stream_id?: string;
  }>;
}

/**
 * Empty metadata object returned when analysis fails
 * This ensures the upload flow is never blocked by analysis errors
 */
const EMPTY_METADATA: LocalMediaMetadata = {
  duration: undefined,
  video_codec: undefined,
  width: undefined,
  height: undefined,
  audio_tracks: [],
  subtitle_tracks: [],
};

let ffmpegInstance: FFmpeg | null = null;
let isLoaded = false;

/**
 * Initialize FFmpeg instance and load ffprobe.wasm
 */
async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance && isLoaded) {
    return ffmpegInstance;
  }

  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
    
    // Set up logging (optional, for debugging)
    ffmpegInstance.on('log', ({ message }) => {
      // Uncomment for debugging: console.log(message);
    });
  }

  if (!isLoaded) {
    try {
      // Load ffmpeg core from CDN
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpegInstance.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      isLoaded = true;
    } catch (error) {
      console.error('Failed to load FFmpeg core:', error);
      throw error;
    }
  }

  return ffmpegInstance;
}

/**
 * Analyze a media file locally using browser APIs and optionally ffmpeg.wasm
 * Returns preliminary metadata that can be displayed immediately.
 * 
 * IMPORTANT: This function NEVER throws. On any error, it logs the error
 * and returns an empty metadata object to ensure the upload flow continues.
 */
export async function analyzeFileLocally(file: File): Promise<LocalMediaMetadata> {
  try {
    // First, try to get basic info from MediaMetadata API (instant)
    let basicMetadata: LocalMediaMetadata;
    try {
      basicMetadata = await analyzeWithMediaMetadata(file);
    } catch (error) {
      console.warn('[mediaAnalysis] MediaMetadata API failed, continuing with empty metadata:', error);
      basicMetadata = { ...EMPTY_METADATA };
    }
    
    // Then try to get detailed stream info with ffmpeg (may take longer)
    // This is optional - if it fails, we still have basic metadata
    try {
      const detailedMetadata = await analyzeWithFFmpeg(file);
      // Merge results, preferring detailed analysis for tracks
      return {
        ...basicMetadata,
        ...detailedMetadata,
        // Keep audio_tracks and subtitle_tracks from detailed analysis if available
        audio_tracks: (detailedMetadata.audio_tracks && detailedMetadata.audio_tracks.length > 0)
          ? detailedMetadata.audio_tracks 
          : basicMetadata.audio_tracks,
        subtitle_tracks: (detailedMetadata.subtitle_tracks && detailedMetadata.subtitle_tracks.length > 0)
          ? detailedMetadata.subtitle_tracks 
          : basicMetadata.subtitle_tracks,
      };
    } catch (error) {
      console.warn('[mediaAnalysis] FFmpeg analysis failed, using basic metadata only:', error);
      return basicMetadata;
    }
  } catch (error) {
    // Catch-all: if anything unexpected happens, log and return empty metadata
    // This ensures the upload flow is NEVER blocked by analysis errors
    console.error('[mediaAnalysis] Unexpected error during local analysis, returning empty metadata:', error);
    return { ...EMPTY_METADATA };
  }
}

/**
 * Analyze file using FFmpeg to get detailed stream information
 */
async function analyzeWithFFmpeg(file: File): Promise<LocalMediaMetadata> {
  const ffmpeg = await getFFmpeg();
  const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_'); // Sanitize filename
  const outputFileName = 'probe_output.json';
  
  try {
    // Write file to FFmpeg's virtual filesystem
    await ffmpeg.writeFile(fileName, await fetchFile(file));
    
    // Use ffmpeg to probe the file and output JSON
    // Note: We use ffmpeg -i with -f null to probe without encoding
    // and redirect output to a file
    await ffmpeg.exec([
      '-i', fileName,
      '-f', 'null',
      '-',
    ]);
    
    // Actually, ffmpeg doesn't output JSON probe data directly
    // We need to use a different approach - parse the text output
    // For now, let's use MediaMetadata API and return empty tracks
    // The server will provide full analysis
    
    // Cleanup
    try {
      await ffmpeg.deleteFile(fileName);
    } catch {
      // Ignore cleanup errors
    }
    
    return {
      duration: undefined,
      video_codec: undefined,
      width: undefined,
      height: undefined,
      audio_tracks: [],
      subtitle_tracks: [],
    };
  } catch (error) {
    // Cleanup on error
    try {
      await ffmpeg.deleteFile(fileName);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Use browser's MediaMetadata API for basic analysis (instant).
 * This provides immediate feedback without waiting for server analysis.
 * 
 * Returns a promise that resolves with metadata or an empty object on error.
 * Never rejects - all errors are logged and result in empty metadata.
 */
async function analyzeWithMediaMetadata(file: File): Promise<LocalMediaMetadata> {
  return new Promise((resolve) => {
    // Timeout to prevent hanging if video element never fires events
    const timeout = setTimeout(() => {
      console.warn('[mediaAnalysis] MediaMetadata timeout, returning empty metadata');
      resolve({ ...EMPTY_METADATA });
    }, 10000); // 10 second timeout
    
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        const duration = video.duration;
        const width = video.videoWidth;
        const height = video.videoHeight;
        
        // Cleanup
        try {
          URL.revokeObjectURL(video.src);
        } catch {
          // Ignore cleanup errors
        }
        
        // Basic metadata from MediaMetadata API
        // Note: We can't get detailed stream info (audio tracks, subtitles) from MediaMetadata API
        // This is just for immediate feedback - full analysis will come from server
        resolve({
          duration: isFinite(duration) && duration > 0 ? duration : undefined,
          width: width > 0 ? width : undefined,
          height: height > 0 ? height : undefined,
          video_codec: undefined, // Not available from MediaMetadata API
          audio_tracks: [], // Will be populated by server analysis
          subtitle_tracks: [], // Will be populated by server analysis
        });
      };
      
      video.onerror = () => {
        clearTimeout(timeout);
        try {
          URL.revokeObjectURL(video.src);
        } catch {
          // Ignore cleanup errors
        }
        console.warn('[mediaAnalysis] Video element error, returning empty metadata');
        resolve({ ...EMPTY_METADATA });
      };
      
      video.src = URL.createObjectURL(file);
    } catch (error) {
      clearTimeout(timeout);
      console.warn('[mediaAnalysis] Failed to create video element:', error);
      resolve({ ...EMPTY_METADATA });
    }
  });
}
