'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getFileMetadata, confirmUploadComplete } from '@/lib/api';

interface PendingFileData {
  file: File;
  fileId: string;
  status: 'uploading' | 'analyzing' | 'ready' | 'error';
  uploadProgress: number;
  metadata?: {
    audio_tracks?: Array<{
      index: number;
      language: string;
      codec: string;
      channels: number;
      default: boolean;
    }>;
    subtitle_tracks?: Array<{
      index: number;
      language: string;
      codec: string;
      forced: boolean;
      default: boolean;
    }>;
    video_codec?: string;
    duration?: number;
  };
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
        </div>
      )}

      {pendingFile.status === 'analyzing' && (
        <div className="flex items-center gap-2 text-sm text-surface-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Analyzing file...</span>
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
