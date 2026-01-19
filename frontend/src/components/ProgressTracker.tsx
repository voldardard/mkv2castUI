'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Download,
  FileVideo,
  AlertCircle,
  Zap,
  StopCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from '@/lib/i18n';
import { useWebSocket } from '@/hooks/useWebSocket';
import { api, downloadFile } from '@/lib/api';

interface Job {
  id: string;
  original_filename: string;
  output_filename?: string;
  status: string;
  progress: number;
  stage: string;
  eta?: number;
  speed?: number;
  fps?: number;
  bitrate?: string;
  error?: string;
}

interface ProgressTrackerProps {
  jobIds: string[];
  lang: string;
  onJobComplete?: (jobId: string) => void;
  onJobCancel?: (jobId: string) => void;
}

export function ProgressTracker({ jobIds, lang, onJobComplete, onJobCancel }: ProgressTrackerProps) {
  const t = useTranslations(lang);
  const [jobs, setJobs] = useState<Map<string, Job>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Fetch job details from API
  const fetchJobDetails = useCallback(async (jobId: string) => {
    try {
      const response = await api.get(`/${lang}/api/jobs/${jobId}/`);
      const jobData = response.data;
      return {
        id: jobData.id,
        original_filename: jobData.original_filename,
        output_filename: jobData.output_filename,
        status: jobData.status,
        progress: jobData.progress || 0,
        stage: jobData.current_stage || '',
        error: jobData.error_message,
      };
    } catch (error: any) {
      // If job not found (404), it was deleted - return null to filter it out
      if (error.response?.status === 404) {
        console.log(`Job ${jobId} not found (likely deleted)`);
        return null;
      }
      console.error(`Failed to fetch job ${jobId}:`, error);
      return null;
    }
  }, [lang]);

  // Fetch all job details on mount or when jobIds change
  useEffect(() => {
    const loadJobs = async () => {
      setIsLoading(true);
      const newJobs = new Map(jobs);
      
      for (const id of jobIds) {
        if (!newJobs.has(id) || newJobs.get(id)?.original_filename === 'Loading...') {
          const jobDetails = await fetchJobDetails(id);
          if (jobDetails) {
            newJobs.set(id, jobDetails);
          } else {
            // Job not found (deleted) - remove it from the map
            newJobs.delete(id);
          }
        }
      }
      
      setJobs(newJobs);
      setIsLoading(false);
    };

    if (jobIds.length > 0) {
      loadJobs();
    } else {
      setIsLoading(false);
    }
  }, [jobIds, fetchJobDetails]);

  const handleJobUpdate = useCallback((jobId: string, data: Partial<Job>) => {
    setJobs((prev) => {
      const newJobs = new Map(prev);
      const existingJob = newJobs.get(jobId);
      if (existingJob) {
        const updatedJob = { ...existingJob, ...data };
        newJobs.set(jobId, updatedJob);
        
        // Notify parent when job completes
        if (data.status === 'completed' && existingJob.status !== 'completed') {
          onJobComplete?.(jobId);
        }
      }
      return newJobs;
    });
  }, [onJobComplete]);

  const handleCancel = useCallback(async (jobId: string) => {
    if (!confirm(t('progress.confirm_cancel') || 'Are you sure you want to cancel this conversion?')) {
      return;
    }
    
    try {
      await api.post(`/${lang}/api/jobs/${jobId}/cancel/`);
      handleJobUpdate(jobId, { status: 'cancelled' });
      onJobCancel?.(jobId);
    } catch (error) {
      console.error('Failed to cancel job:', error);
    }
  }, [lang, handleJobUpdate, onJobCancel, t]);

  const handleDownload = useCallback(async (job: Job) => {
    try {
      const filename = job.output_filename || job.original_filename.replace('.mkv', '.mp4');
      await downloadFile(lang, job.id, filename);
    } catch (error) {
      console.error('Download failed:', error);
      alert(t('progress.download_error') || 'Download failed. Please try again.');
    }
  }, [lang, t]);

  if (isLoading && jobs.size === 0) {
    return (
      <div className="text-center py-8 text-surface-500">
        <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary-400" />
        <p>Loading...</p>
      </div>
    );
  }

  if (jobs.size === 0) {
    return (
      <div className="text-center py-8 text-surface-500">
        <FileVideo className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>{t('progress.no_jobs')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {Array.from(jobs.values()).map((job) => (
          <JobCard
            key={job.id}
            job={job}
            lang={lang}
            onUpdate={(data) => handleJobUpdate(job.id, data)}
            onCancel={() => handleCancel(job.id)}
            onDownload={() => handleDownload(job)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface JobCardProps {
  job: Job;
  lang: string;
  onUpdate: (data: Partial<Job>) => void;
  onCancel: () => void;
  onDownload: () => void;
}

function JobCard({ job, lang, onUpdate, onCancel, onDownload }: JobCardProps) {
  const t = useTranslations(lang);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // WebSocket for real-time updates
  useWebSocket(
    `/ws/conversion/${job.id}/`,
    {
      onMessage: (data) => {
        onUpdate({
          progress: data.progress,
          status: data.status,
          stage: data.stage,
          eta: data.eta,
          speed: data.speed,
          fps: data.fps,
          bitrate: data.bitrate,
          error: data.error,
        });
      },
    }
  );

  const statusConfig = {
    pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10', spin: false },
    queued: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10', spin: false },
    analyzing: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/10', spin: true },
    processing: { icon: Loader2, color: 'text-primary-400', bg: 'bg-primary-500/10', spin: true },
    completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', spin: false },
    failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', spin: false },
    cancelled: { icon: XCircle, color: 'text-surface-400', bg: 'bg-surface-500/10', spin: false },
  };

  const config = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.queued;
  const StatusIcon = config.icon;
  const isActive = ['pending', 'queued', 'analyzing', 'processing'].includes(job.status);

  const handleDownloadClick = async () => {
    setIsDownloading(true);
    try {
      await onDownload();
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCancelClick = async () => {
    setIsCancelling(true);
    try {
      await onCancel();
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 bg-surface-800/50 rounded-xl border border-surface-700"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`p-2 rounded-lg ${config.bg}`}>
          <StatusIcon className={`w-4 h-4 ${config.color} ${config.spin ? 'animate-spin' : ''}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate" title={job.original_filename}>
            {job.original_filename}
          </p>
          <p className="text-xs text-surface-500 capitalize">
            {t(`status.${job.status}`)} {job.stage && `• ${job.stage}`}
          </p>
        </div>
        
        {/* Cancel button for active jobs */}
        {isActive && (
          <button
            onClick={handleCancelClick}
            disabled={isCancelling}
            className="p-2 text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors disabled:opacity-50"
            title={t('progress.cancel') || 'Cancel'}
          >
            {isCancelling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <StopCircle className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {(job.status === 'processing' || job.status === 'analyzing') && (
        <div className="mb-3">
          <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full progress-bar rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${job.progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-surface-500">
            <span className="flex items-center gap-2">
              {job.progress}%
              {job.speed && job.speed > 0 && (
                <span className="flex items-center gap-0.5 text-primary-400">
                  <Zap className="w-3 h-3" />
                  {job.speed.toFixed(1)}x
                </span>
              )}
              {job.fps && job.fps > 0 && (
                <span className="text-surface-400">
                  {job.fps.toFixed(0)} fps
                </span>
              )}
              {job.bitrate && (
                <span className="text-surface-400">
                  {job.bitrate}
                </span>
              )}
            </span>
            {job.eta !== undefined && job.eta !== null && (
              <span>ETA: {formatTime(job.eta)}</span>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {job.status === 'failed' && job.error && (
        <div className="flex items-start gap-2 p-2 bg-red-500/10 rounded-lg text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{job.error}</span>
        </div>
      )}

      {/* Cancelled Message */}
      {job.status === 'cancelled' && (
        <div className="flex items-center gap-2 p-2 bg-surface-700/50 rounded-lg text-surface-400 text-xs">
          <StopCircle className="w-4 h-4 flex-shrink-0" />
          <span>{t('progress.cancelled') || 'Conversion cancelled'}</span>
        </div>
      )}

      {/* Download Button */}
      {job.status === 'completed' && (
        <button
          onClick={handleDownloadClick}
          disabled={isDownloading}
          className="flex items-center justify-center gap-2 w-full py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors disabled:opacity-50"
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">
            {isDownloading ? (t('progress.downloading') || 'Downloading...') : (t('progress.download') || 'Download')}
          </span>
        </button>
      )}
    </motion.div>
  );
}

/**
 * Format time in a human-friendly way
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '< 1 min';
  
  // Round to nearest 5 seconds for smoother display
  seconds = Math.round(seconds / 5) * 5;
  
  if (seconds < 30) return '< 1 min';
  if (seconds < 60) return '~1 min';
  
  if (seconds < 3600) {
    const mins = Math.round(seconds / 60);
    return `~${mins} min${mins > 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  
  if (mins === 0) {
    return `~${hours}h`;
  }
  return `~${hours}h ${mins}m`;
}
