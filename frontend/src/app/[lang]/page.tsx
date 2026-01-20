'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/Header';
import { FileUploader } from '@/components/FileUploader';
import { ConversionOptions } from '@/components/ConversionOptions';
import { FileList } from '@/components/FileList';
import { PendingFileItem } from '@/components/PendingFileItem';
import { ProgressTracker } from '@/components/ProgressTracker';
import { LoginPrompt } from '@/components/LoginPrompt';
import { useTranslations } from '@/lib/i18n';
import { useRequireAuth, useCurrentUser } from '@/hooks/useAuthConfig';
import { useActiveJobs } from '@/hooks/useConversion';
import { api, requestUploadUrl, uploadFileDirectly, createJobFromFile, confirmUploadComplete, getFileMetadata, analyzeFileLocally } from '@/lib/api';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function HomePage({ params: { lang } }: { params: { lang: string } }) {
  const { data: session, status } = useSession();
  const { requireAuth, config } = useRequireAuth();
  const { data: localUser } = useCurrentUser();
  const t = useTranslations(lang);
  const [files, setFiles] = useState<File[]>([]);
  const [pendingFiles, setPendingFiles] = useState<Map<string, {
    file: File;
    fileId: string;
    status: 'uploading' | 'analyzing' | 'ready' | 'error';
    uploadProgress: number;
    metadata?: any;
    error?: string;
  }>>(new Map());
  const [options, setOptions] = useState({
    container: 'mkv',
    hw_backend: 'auto',
    preset: 'slow',
    crf: 20,
    audio_bitrate: '192k',
    // Hardware-specific quality
    vaapi_qp: 23,
    qsv_quality: 23,
    nvenc_cq: 23,
    amf_quality: 23,
    // Codec options
    force_h264: false,
    allow_hevc: false,
    force_aac: false,
    keep_surround: false,
    // Audio/Subtitle selection
    audio_lang: '',
    audio_track: null as number | null,
    subtitle_lang: '',
    subtitle_track: null as number | null,
    prefer_forced_subs: true,
    no_subtitles: false,
    // Optimization
    skip_when_ok: true,
    no_silence: false,
    // Integrity checks
    integrity_check: true,
    deep_check: false,
  });
  const [activeJobs, setActiveJobs] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Fetch active jobs from API on mount
  const { data: serverActiveJobs } = useActiveJobs(lang);

  // Sync server active jobs with local state
  useEffect(() => {
    if (serverActiveJobs && serverActiveJobs.length > 0) {
      setActiveJobs((prev) => {
        // Merge server jobs with any locally tracked jobs
        const merged = new Set([...prev, ...serverActiveJobs]);
        return Array.from(merged);
      });
    }
  }, [serverActiveJobs]);

  // Handle job completion - remove from active list
  const handleJobComplete = (jobId: string) => {
    setActiveJobs((prev) => prev.filter((id) => id !== jobId));
  };

  // Handle job cancellation - remove from active list  
  const handleJobCancel = (jobId: string) => {
    setActiveJobs((prev) => prev.filter((id) => id !== jobId));
  };

  const handleFilesSelected = async (newFiles: File[]) => {
    // Upload files immediately - process each file in parallel
    for (const file of newFiles) {
      // Generate a temporary ID for the file card (will be replaced by server file_id)
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      let fileId: string = tempId;
      
      // Create pending file entry IMMEDIATELY (before any async operations)
      // This ensures the card is always visible, even if later steps fail
      setPendingFiles((prev) => {
        const newMap = new Map(prev);
        newMap.set(tempId, {
          file,
          fileId: tempId,
          status: 'uploading' as const,
          uploadProgress: 0,
          metadata: undefined,
        });
        return newMap;
      });
      
      try {
        // Pre-analyze file locally for immediate metadata display (non-blocking)
        // analyzeFileLocally NEVER throws - it always returns a valid object
        const preliminaryMetadata = await analyzeFileLocally(file);
        
        // Update pending file with preliminary metadata
        setPendingFiles((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(tempId);
          if (existing) {
            newMap.set(tempId, { ...existing, metadata: preliminaryMetadata });
          }
          return newMap;
        });
        
        // Request presigned URL from server
        let uploadData;
        try {
          uploadData = await requestUploadUrl(lang, file.name, file.size);
        } catch (error: any) {
          console.error('[upload] Failed to get presigned URL:', error);
          setPendingFiles((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(tempId);
            if (existing) {
              newMap.set(tempId, { 
                ...existing, 
                status: 'error', 
                error: error.response?.data?.detail || error.message || 'Failed to prepare upload'
              });
            }
            return newMap;
          });
          continue; // Move to next file
        }
        
        const { file_id: fid, upload_url } = uploadData;
        
        // Ensure file_id is valid before proceeding
        if (!fid || !upload_url) {
          console.error('[upload] Invalid response from server:', uploadData);
          setPendingFiles((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(tempId);
            if (existing) {
              newMap.set(tempId, { 
                ...existing, 
                status: 'error', 
                error: 'Invalid response from server'
              });
            }
            return newMap;
          });
          continue; // Move to next file
        }
        
        // Update the entry with the real file ID from server
        fileId = fid;
        setPendingFiles((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(tempId);
          if (existing) {
            // Remove temp entry and add with real ID
            newMap.delete(tempId);
            newMap.set(fileId, { ...existing, fileId });
          }
          return newMap;
        });
        
        // Upload file directly to S3
        try {
          await uploadFileDirectly(upload_url, file, (progress) => {
            setPendingFiles((prev) => {
              const newMap = new Map(prev);
              const existing = newMap.get(fileId);
              if (existing) {
                newMap.set(fileId, { ...existing, uploadProgress: progress });
              }
              return newMap;
            });
          });
        } catch (error: any) {
          console.error('[upload] Failed to upload to S3:', error);
          setPendingFiles((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(fileId);
            if (existing) {
              newMap.set(fileId, { 
                ...existing, 
                status: 'error', 
                error: error.message || 'Upload to storage failed'
              });
            }
            return newMap;
          });
          continue; // Move to next file
        }
        
        // Mark upload complete (will trigger analysis)
        setPendingFiles((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(fileId);
          if (existing) {
            newMap.set(fileId, { ...existing, status: 'analyzing', uploadProgress: 100 });
          }
          return newMap;
        });
        
        // Confirm upload and start server-side analysis
        try {
          await confirmUploadComplete(lang, fileId);
        } catch (error: any) {
          console.error('[upload] Failed to confirm upload:', error);
          const errorMsg = error.response?.data?.detail || error.message || 'Failed to confirm upload';
          setPendingFiles((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(fileId);
            if (existing) {
              newMap.set(fileId, { 
                ...existing, 
                status: 'error', 
                error: errorMsg
              });
            }
            return newMap;
          });
          continue; // Move to next file
        }
        
        // Start polling for metadata (WebSocket will also update)
        pollFileMetadata(fileId);
        
      } catch (error: any) {
        // Catch-all for any unexpected errors
        console.error('[upload] Unexpected error:', error);
        const currentId = fileId !== tempId ? fileId : tempId;
        setPendingFiles((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(currentId);
          if (existing) {
            newMap.set(currentId, { 
              ...existing, 
              status: 'error', 
              error: error.message || 'An unexpected error occurred'
            });
          }
          return newMap;
        });
      }
    }
  };

  const pollFileMetadata = async (fileId: string) => {
    const maxAttempts = 60; // 5 minutes max (5s intervals)
    const retryDelay = 5000;
    let attempts = 0;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;

    const poll = async () => {
      try {
        const { getFileMetadata } = await import('@/lib/api');
        const result = await getFileMetadata(lang, fileId);
        consecutiveErrors = 0; // Reset error counter on success
        
        if (result.status === 'ready' && result.metadata) {
          // Server analysis complete - update with server metadata (source of truth)
          setPendingFiles((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(fileId);
            if (existing) {
              newMap.set(fileId, { 
                ...existing, 
                status: 'ready', 
                metadata: result.metadata // Server metadata replaces preliminary
              });
            }
            return newMap;
          });
          return;
        }
        
        if (result.status === 'analyzing' || result.status === 'uploading') {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, retryDelay);
          } else {
            // Timeout - file analysis took too long
            console.warn(`[pollFileMetadata] Timeout waiting for file ${fileId} analysis`);
            setPendingFiles((prev) => {
              const newMap = new Map(prev);
              const existing = newMap.get(fileId);
              if (existing && existing.status === 'analyzing') {
                newMap.set(fileId, { 
                  ...existing, 
                  status: 'error', 
                  error: 'Analysis timeout. Please try again.'
                });
              }
              return newMap;
            });
          }
          return;
        }
        
        // Handle error status from server
        if (result.status === 'error' || result.status === 'expired') {
          setPendingFiles((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(fileId);
            if (existing) {
              newMap.set(fileId, { 
                ...existing, 
                status: 'error', 
                error: result.message || 'File analysis failed'
              });
            }
            return newMap;
          });
        }
      } catch (error: any) {
        consecutiveErrors++;
        console.error(`[pollFileMetadata] Error (attempt ${attempts + 1}, consecutive errors: ${consecutiveErrors}):`, error);
        
        // Only mark as error after multiple consecutive failures
        if (consecutiveErrors >= maxConsecutiveErrors) {
          const errorMsg = error.response?.data?.detail || error.message || 'Failed to get file metadata';
          setPendingFiles((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(fileId);
            if (existing && existing.status === 'analyzing') {
              newMap.set(fileId, { 
                ...existing, 
                status: 'error', 
                error: errorMsg
              });
            }
            return newMap;
          });
          return;
        }
        
        // Retry with exponential backoff on transient errors
        attempts++;
        if (attempts < maxAttempts) {
          const backoffDelay = Math.min(retryDelay * Math.pow(1.5, consecutiveErrors), 30000);
          setTimeout(poll, backoffDelay);
        }
      }
    };

    poll();
  };

  const handleFileReady = (fileId: string, metadata: any) => {
    setPendingFiles((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(fileId);
      if (existing) {
        newMap.set(fileId, { ...existing, status: 'ready', metadata });
      }
      return newMap;
    });
  };

  const handleRemovePendingFile = (fileId: string) => {
    setPendingFiles((prev) => {
      const newMap = new Map(prev);
      newMap.delete(fileId);
      return newMap;
    });
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartConversion = async () => {
    // Determine if user has access (logged in via SSO, local token, or auth disabled)
    const isAuthenticated = !!session || !!localUser || !!config?.user;
    
    if (requireAuth && !isAuthenticated) {
      setUploadError('Please log in to start conversion');
      return;
    }
    
    // Get ready files from pendingFiles
    const readyFiles = Array.from(pendingFiles.values()).filter(
      (pf) => pf.status === 'ready'
    );
    
    if (readyFiles.length === 0 && files.length === 0) return;

    setIsUploading(true);
    setUploadError('');
    setUploadSuccess('');

    const uploadedJobs: string[] = [];
    let hasError = false;

    // Process ready pending files (new flow)
    for (const pendingFile of readyFiles) {
      try {
        // Use metadata to set default audio/subtitle tracks if not specified
        const fileOptions = { ...options };
        
        if (pendingFile.metadata?.audio_tracks && pendingFile.metadata.audio_tracks.length > 0) {
          if (!fileOptions.audio_track && !fileOptions.audio_lang) {
            // Use first track or default track
            const defaultTrack = pendingFile.metadata.audio_tracks.find((t: any) => t.default) || pendingFile.metadata.audio_tracks[0];
            if (defaultTrack) {
              fileOptions.audio_track = defaultTrack.index;
            }
          }
        }
        
        if (pendingFile.metadata?.subtitle_tracks && pendingFile.metadata.subtitle_tracks.length > 0) {
          if (!fileOptions.subtitle_track && !fileOptions.subtitle_lang && !fileOptions.no_subtitles) {
            // Use first track or default track
            const defaultTrack = pendingFile.metadata.subtitle_tracks.find((t: any) => t.default) || pendingFile.metadata.subtitle_tracks[0];
            if (defaultTrack) {
              fileOptions.subtitle_track = defaultTrack.index;
            }
          }
        }
        
        const job = await createJobFromFile(lang, pendingFile.fileId, fileOptions);
        
        if (job?.id) {
          uploadedJobs.push(job.id);
        }
      } catch (err: any) {
        hasError = true;
        const errorMsg = err.response?.data?.detail || 'Failed to create conversion job';
        setUploadError(errorMsg);
        break;
      }
    }

    // Process legacy files (fallback)
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        Object.entries(options).forEach(([key, value]) => {
          if (value !== null && value !== '' && value !== false) {
            formData.append(key, String(value));
          }
        });

        const response = await api.post(`/${lang}/api/upload/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data?.id) {
          uploadedJobs.push(response.data.id);
        }
      } catch (err: any) {
        hasError = true;
        const errorMsg = err.response?.data?.detail || err.response?.data?.file?.[0] || 'Upload failed';
        setUploadError(errorMsg);
        break;
      }
    }

    setIsUploading(false);

    if (!hasError && uploadedJobs.length > 0) {
      setActiveJobs((prev) => [...prev, ...uploadedJobs]);
      setUploadSuccess(`Successfully started ${uploadedJobs.length} conversion(s)`);
      setPendingFiles(new Map());
      setFiles([]);
      setTimeout(() => setUploadSuccess(''), 3000);
    }
  };

  // Only show loading if auth is required AND session is loading
  // If auth is disabled, skip the loading state entirely
  if (requireAuth && status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Determine if user has access (logged in via SSO, local token, or auth disabled)
  const isAuthenticated = !!session || !!localUser || !!config?.user;
  const hasAccess = !requireAuth || isAuthenticated;

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950">
      <Header lang={lang} />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 bg-clip-text text-transparent mb-4">
            {t('hero.title')}
          </h1>
          <p className="text-lg text-surface-400 max-w-2xl mx-auto">
            {t('hero.subtitle')}
          </p>
          {/* Show local mode indicator */}
          {!requireAuth && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Mode local - Authentification désactivée
            </div>
          )}
        </section>

        {!hasAccess ? (
          <LoginPrompt lang={lang} />
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Upload & Options Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* File Uploader */}
              <section className="glass rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  {t('upload.title')}
                </h2>
                <FileUploader
                  onFilesSelected={handleFilesSelected}
                  lang={lang}
                />
              </section>

              {/* Pending Files List (new upload flow) */}
              {pendingFiles.size > 0 && (
                <section className="glass rounded-2xl p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">
                    Uploaded Files ({pendingFiles.size})
                  </h2>
                  <div className="space-y-3">
                    {Array.from(pendingFiles.values()).map((pendingFile) => (
                      <PendingFileItem
                        key={pendingFile.fileId}
                        pendingFile={pendingFile}
                        lang={lang}
                        onRemove={() => handleRemovePendingFile(pendingFile.fileId)}
                        onReady={handleFileReady}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Legacy Files List (fallback) */}
              {files.length > 0 && (
                <section className="glass rounded-2xl p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">
                    {t('files.selected')} ({files.length})
                  </h2>
                  <FileList files={files} onRemove={handleRemoveFile} />
                </section>
              )}

              {/* Conversion Options */}
              <section className="glass rounded-2xl p-6">
                <ConversionOptions
                  options={options}
                  onChange={setOptions}
                  lang={lang}
                />
              </section>

              {/* Messages */}
              {uploadError && (
                <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
              {uploadSuccess && (
                <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {/* Start Button */}
              {(files.length > 0 ||
                (pendingFiles &&
                  pendingFiles instanceof Map &&
                  Array.from(pendingFiles.values()).some((pf) => pf.status === 'ready'))) && (
                <button
                  onClick={handleStartConversion}
                  disabled={isUploading}
                  className="w-full py-4 px-6 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Uploading...
                    </>
                  ) : pendingFiles && pendingFiles instanceof Map ? (
                    <>
                      {t('convert.start')} (
                        {files.length +
                          Array.from(pendingFiles.values()).filter((pf) => pf.status === 'ready').length}{' '}
                        {files.length +
                          Array.from(pendingFiles.values()).filter((pf) => pf.status === 'ready').length === 1
                          ? t('files.file')
                          : t('files.files')}
                      )
                    </>
                  ) : (
                    <>
                      {t('convert.start')} ({files.length} {files.length === 1 ? t('files.file') : t('files.files')})
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Progress Column */}
            <div className="space-y-6">
              <section className="glass rounded-2xl p-6 sticky top-4">
                <h2 className="text-xl font-semibold text-white mb-4">
                  {t('progress.title')}
                </h2>
                <ProgressTracker 
                  jobIds={activeJobs} 
                  lang={lang} 
                  onJobComplete={handleJobComplete}
                  onJobCancel={handleJobCancel}
                />
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-800 mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-surface-500 text-sm">
          <p>
            mkv2cast UI &copy; {new Date().getFullYear()} — {t('footer.powered_by')}{' '}
            <a
              href="https://github.com/voldardard/mkv2cast"
              className="text-primary-400 hover:text-primary-300 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              mkv2cast
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
