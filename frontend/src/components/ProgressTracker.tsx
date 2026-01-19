'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Download,
  FileVideo,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from '@/lib/i18n';
import { useWebSocket } from '@/hooks/useWebSocket';

interface Job {
  id: string;
  original_filename: string;
  status: string;
  progress: number;
  stage: string;
  eta?: number;
  error?: string;
}

interface ProgressTrackerProps {
  jobIds: string[];
  lang: string;
}

export function ProgressTracker({ jobIds, lang }: ProgressTrackerProps) {
  const t = useTranslations(lang);
  const [jobs, setJobs] = useState<Map<string, Job>>(new Map());

  // Connect to WebSocket for each job
  useEffect(() => {
    const newJobs = new Map(jobs);
    
    jobIds.forEach((id) => {
      if (!newJobs.has(id)) {
        newJobs.set(id, {
          id,
          original_filename: 'Loading...',
          status: 'queued',
          progress: 0,
          stage: '',
        });
      }
    });
    
    setJobs(newJobs);
  }, [jobIds]);

  const handleJobUpdate = (jobId: string, data: Partial<Job>) => {
    setJobs((prev) => {
      const newJobs = new Map(prev);
      const existingJob = newJobs.get(jobId);
      if (existingJob) {
        newJobs.set(jobId, { ...existingJob, ...data });
      }
      return newJobs;
    });
  };

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
}

function JobCard({ job, lang, onUpdate }: JobCardProps) {
  const t = useTranslations(lang);
  const { lastMessage, connectionStatus } = useWebSocket(
    `/ws/conversion/${job.id}/`,
    {
      onMessage: (data) => {
        onUpdate({
          progress: data.progress,
          status: data.status,
          stage: data.stage,
          eta: data.eta,
          error: data.error,
        });
      },
    }
  );

  const statusConfig = {
    queued: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10', spin: false },
    analyzing: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/10', spin: true },
    processing: { icon: Loader2, color: 'text-primary-400', bg: 'bg-primary-500/10', spin: true },
    completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', spin: false },
    failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', spin: false },
    cancelled: { icon: XCircle, color: 'text-surface-400', bg: 'bg-surface-500/10', spin: false },
  };

  const config = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.queued;
  const StatusIcon = config.icon;

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
          <p className="text-sm font-medium text-white truncate">{job.original_filename}</p>
          <p className="text-xs text-surface-500 capitalize">
            {t(`status.${job.status}`)} {job.stage && `• ${job.stage}`}
          </p>
        </div>
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
            <span>{job.progress}%</span>
            {job.eta && <span>ETA: {formatTime(job.eta)}</span>}
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

      {/* Download Button */}
      {job.status === 'completed' && (
        <a
          href={`/${lang}/api/jobs/${job.id}/download/`}
          className="flex items-center justify-center gap-2 w-full py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">{t('progress.download')}</span>
        </a>
      )}
    </motion.div>
  );
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}
