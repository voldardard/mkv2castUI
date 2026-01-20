'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getFileMetadata, confirmUploadComplete } from '@/lib/api';
import { useWebSocket } from '@/hooks';

/**
 * Metadata structure that can come from either:
 * - Local analysis (preliminary, via analyzeFileLocally)
 * - Server analysis (authoritative, via ffprobe)
 * 
 * Server metadata includes additional fields (ffmpeg_index, stream_id)
 * that are used for track selection in conversion.
 */
interface FileMetadata {
  audio_tracks?: Array<{
    index?: number;
    ffmpeg_index?: number;
    language: string;
    title?: string;
    codec: string;
    channels: number;
    default?: boolean;
    forced?: boolean;
    stream_id?: string;
  }>;
  subtitle_tracks?: Array<{
    index?: number;
    ffmpeg_index?: number;
    language: string;
    title?: string;
    codec: string;
    forced?: boolean;
    default?: boolean;
    hearing_impaired?: boolean;
    stream_id?: string;
  }>;
  video_codec?: string;
  duration?: number;
  width?: number;
  height?: number;
}

interface PendingFileData {
  file: File;
  fileId: string;
  status: 'uploading' | 'analyzing' | 'ready' | 'error';
  uploadProgress: number;
  metadata?: FileMetadata;
  error?: string;
}

interface PendingFileItemProps {
  pendingFile: PendingFileData;
  lang: string;
  onRemove: () => void;
  onReady: (fileId: string, metadata: any) => void;
}

export function PendingFileItem({ pendingFile, lang, onRemove, onReady }: PendingFileItemProps) {
  const [isPolling, setIsPolling] = useState(false);
  const [analysisState, setAnalysisState] = useState<{
    progress?: number;
    stage?: string;
    message?: string;
    etaSeconds?: number;
    etaBreakdown?: { download_eta?: number; analysis_eta?: number; total_eta?: number };
    downloadSpeedMbps?: number;
  }>({});

  // WebSocket for real-time analysis updates
  useWebSocket(
    `/ws/pending-file/${pendingFile.fileId}/`,
    {
      onMessage: (data) => {
        if (data.type === 'progress' || data.type === 'pending_file_progress') {
          setAnalysisState({
            progress: data.progress,
            stage: data.stage,
            message: data.message,
            etaSeconds: data.eta_seconds,
            etaBreakdown: data.eta_breakdown,
            downloadSpeedMbps: data.download_speed_mbps,
          });
          
          // If status changed to ready, trigger onReady
          if (data.status === 'ready' && pendingFile.status !== 'ready') {
            // Fetch full metadata
            getFileMetadata(lang, pendingFile.fileId).then((result) => {
              if (result.status === 'ready' && result.metadata) {
                onReady(pendingFile.fileId, result.metadata);
              }
            });
          }
        } else if (data.type === 'status') {
          // Initial status from WebSocket
          if (data.status === 'ready' && data.metadata) {
            onReady(pendingFile.fileId, data.metadata);
          }
        }
      },
      onError: (error) => {
        console.warn('WebSocket error for pending file:', error);
        // Fallback to polling if WebSocket fails
        if (pendingFile.status === 'analyzing' && !isPolling) {
          pollMetadata();
        }
      },
    }
  );

  const handleUploadComplete = useCallback(async () => {
    try {
      await confirmUploadComplete(lang, pendingFile.fileId);
      // Status will be updated by parent component
    } catch (error: any) {
      console.error('Failed to confirm upload:', error);
    }
  }, [lang, pendingFile.fileId]);

  const pollMetadata = useCallback(async () => {
    setIsPolling(true);
    const maxAttempts = 60; // 5 minutes max (5s intervals)
    let attempts = 0;

    const poll = async () => {
      try {
        const result = await getFileMetadata(lang, pendingFile.fileId);
        
        if (result.status === 'ready' && result.metadata) {
          onReady(pendingFile.fileId, result.metadata);
          setIsPolling(false);
          return;
        }
        
        if (result.status === 'analyzing') {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000); // Poll every 5 seconds
          } else {
            setIsPolling(false);
          }
        }
      } catch (error) {
        console.error('Failed to get metadata:', error);
        setIsPolling(false);
      }
    };

    poll();
  }, [lang, pendingFile.fileId, onReady]);

  useEffect(() => {
    // Start polling when upload is complete
    if (pendingFile.status === 'uploading' && pendingFile.uploadProgress === 100) {
      handleUploadComplete();
    }
  }, [pendingFile.uploadProgress, pendingFile.status, handleUploadComplete]);

  useEffect(() => {
    // Poll for metadata when analyzing
    if (pendingFile.status === 'analyzing' && !isPolling) {
      pollMetadata();
    }
  }, [pendingFile.status, isPolling, pollMetadata]);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatETA = (seconds?: number) => {
    if (!seconds || seconds < 0) return null;
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (minutes < 60) {
      return `${minutes}m ${secs}s`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="border border-surface-700 rounded-xl p-4 bg-surface-900/50">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{pendingFile.file.name}</p>
          <p className="text-sm text-surface-400">
            {(pendingFile.file.size / (1024 * 1024)).toFixed(2)} MB
          </p>
        </div>
        <button
          onClick={onRemove}
          className="ml-2 p-1 text-surface-400 hover:text-red-400 transition-colors"
          aria-label="Remove file"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Status indicator */}
      {pendingFile.status === 'uploading' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-surface-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Uploading... {pendingFile.uploadProgress}%</span>
          </div>
          <div className="w-full bg-surface-800 rounded-full h-2">
            <div
              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${pendingFile.uploadProgress}%` }}
            />
          </div>
          
          {/* Show preliminary metadata during upload */}
          {pendingFile.metadata && (
            <div className="text-xs text-surface-400 space-y-1 mt-2 pt-2 border-t border-surface-800">
              {pendingFile.metadata.duration && (
                <div>
                  <span className="text-surface-500">Duration:</span>{' '}
                  <span className="text-surface-300">{formatDuration(pendingFile.metadata.duration)}</span>
                </div>
              )}
              {(pendingFile.metadata.width || pendingFile.metadata.height) && (
                <div>
                  <span className="text-surface-500">Resolution:</span>{' '}
                  <span className="text-surface-300">
                    {pendingFile.metadata.width}x{pendingFile.metadata.height}
                  </span>
                </div>
              )}
              {pendingFile.metadata.audio_tracks && pendingFile.metadata.audio_tracks.length > 0 && (
                <div>
                  <span className="text-surface-500">Audio:</span>{' '}
                  <span className="text-surface-300">
                    {pendingFile.metadata.audio_tracks.length} track{pendingFile.metadata.audio_tracks.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {pendingFile.metadata.subtitle_tracks && pendingFile.metadata.subtitle_tracks.length > 0 && (
                <div>
                  <span className="text-surface-500">Subtitles:</span>{' '}
                  <span className="text-surface-300">
                    {pendingFile.metadata.subtitle_tracks.length} track{pendingFile.metadata.subtitle_tracks.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}
              <div className="text-surface-500 italic text-xs mt-1">
                (Full analysis in progress...)
              </div>
            </div>
          )}
        </div>
      )}

      {pendingFile.status === 'analyzing' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-surface-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>
              {analysisState.message || analysisState.stage === 'STREAM_ANALYZING' 
                ? 'Analyzing file directly from storage (streaming)...'
                : analysisState.stage === 'DOWNLOADING'
                ? 'Downloading file from storage...'
                : analysisState.stage === 'ANALYZING'
                ? 'Analyzing file...'
                : 'Analyzing file...'}
            </span>
            {analysisState.etaSeconds !== undefined && analysisState.etaSeconds > 0 && (
              <span className="text-surface-500">
                (ETA: {formatETA(analysisState.etaSeconds)})
              </span>
            )}
          </div>
          {analysisState.etaBreakdown && (
            <div className="text-xs text-surface-500 pl-6">
              {analysisState.etaBreakdown.download_eta !== undefined && analysisState.etaBreakdown.download_eta > 0 && (
                <span>Download: {formatETA(analysisState.etaBreakdown.download_eta)}</span>
              )}
              {analysisState.etaBreakdown.analysis_eta !== undefined && analysisState.etaBreakdown.analysis_eta > 0 && (
                <span className={analysisState.etaBreakdown.download_eta ? ' ml-2' : ''}>
                  Analysis: {formatETA(analysisState.etaBreakdown.analysis_eta)}
                </span>
              )}
            </div>
          )}
          {analysisState.downloadSpeedMbps !== undefined && analysisState.downloadSpeedMbps > 0 && (
            <div className="text-xs text-surface-500 pl-6">
              Speed: {analysisState.downloadSpeedMbps.toFixed(1)} MB/s
            </div>
          )}
          {analysisState.progress !== undefined && analysisState.progress > 0 && analysisState.progress < 100 && (
            <div className="w-full bg-surface-800 rounded-full h-2">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${analysisState.progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {pendingFile.status === 'ready' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span>Ready for conversion</span>
          </div>

          {/* Metadata display */}
          {pendingFile.metadata && (
            <div className="text-sm text-surface-300 space-y-2">
              {pendingFile.metadata.video_codec && (
                <div>
                  <span className="text-surface-500">Video:</span>{' '}
                  <span className="text-white">{pendingFile.metadata.video_codec}</span>
                </div>
              )}
              {pendingFile.metadata.duration && (
                <div>
                  <span className="text-surface-500">Duration:</span>{' '}
                  <span className="text-white">{formatDuration(pendingFile.metadata.duration)}</span>
                </div>
              )}
              {pendingFile.metadata.audio_tracks && pendingFile.metadata.audio_tracks.length > 0 && (
                <div>
                  <span className="text-surface-500">Audio tracks:</span>{' '}
                  <span className="text-white">
                    {pendingFile.metadata.audio_tracks.length} ({pendingFile.metadata.audio_tracks.map(t => t.language).join(', ')})
                  </span>
                </div>
              )}
              {pendingFile.metadata.subtitle_tracks && pendingFile.metadata.subtitle_tracks.length > 0 && (
                <div>
                  <span className="text-surface-500">Subtitle tracks:</span>{' '}
                  <span className="text-white">
                    {pendingFile.metadata.subtitle_tracks.length} ({pendingFile.metadata.subtitle_tracks.map(t => t.language).join(', ')})
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {pendingFile.status === 'error' && (
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span>{pendingFile.error || 'Error processing file'}</span>
        </div>
      )}
    </div>
  );
}
