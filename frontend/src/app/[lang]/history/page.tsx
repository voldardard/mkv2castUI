'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useConversionJobs, useDeleteJob, useCancelJob } from '@/hooks/useConversion';
import { useRequireAuth, useCurrentUser } from '@/hooks/useAuthConfig';
import { useTranslations } from '@/lib/i18n';
import { downloadFile } from '@/lib/api';
import { Header } from '@/components/Header';
import { LoginPrompt } from '@/components/LoginPrompt';
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Download,
  StopCircle,
  FileVideo,
  HardDrive,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HistoryPage({ params: { lang } }: { params: { lang: string } }) {
  const { data: session, status: authStatus } = useSession();
  const { requireAuth, config } = useRequireAuth();
  const { data: localUser } = useCurrentUser();
  const t = useTranslations(lang);
  const { data: jobs, isLoading, error } = useConversionJobs(lang);
  const deleteJob = useDeleteJob(lang);
  const cancelJob = useCancelJob(lang);
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null);

  const handleDownload = async (jobId: string, filename: string) => {
    setDownloadingJobId(jobId);
    try {
      await downloadFile(lang, jobId, filename);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Download failed. Please try again.');
    } finally {
      setDownloadingJobId(null);
    }
  };

  // Only show loading if auth is required AND session is loading
  if (requireAuth && authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // User has access if auth is disabled OR they're logged in (via SSO or local token)
  const isAuthenticated = !!session || !!localUser || !!config?.user;
  const hasAccess = !requireAuth || isAuthenticated;

  const statusConfig = {
    pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10', spin: false },
    queued: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10', spin: false },
    analyzing: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/10', spin: true },
    processing: { icon: Loader2, color: 'text-primary-400', bg: 'bg-primary-500/10', spin: true },
    completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', spin: false },
    failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', spin: false },
    cancelled: { icon: StopCircle, color: 'text-surface-400', bg: 'bg-surface-500/10', spin: false },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950">
      <Header lang={lang} />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-white mb-8">
          {t('nav.history')}
        </h1>

        {!hasAccess ? (
          <LoginPrompt lang={lang} />
        ) : isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400">
            <XCircle className="w-12 h-12 mx-auto mb-4" />
            <p>Failed to load conversion history</p>
          </div>
        ) : jobs && jobs.length === 0 ? (
          <div className="text-center py-16 text-surface-500">
            <FileVideo className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No conversions yet</p>
            <p className="text-sm mt-2">Upload some MKV files to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {jobs?.map((job) => {
                const config = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.pending;
                const StatusIcon = config.icon;

                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="glass rounded-xl p-4 md:p-6"
                  >
                    <div className="flex items-start gap-4">
                      {/* Status Icon */}
                      <div className={`flex-shrink-0 p-3 rounded-xl ${config.bg}`}>
                        <StatusIcon
                          className={`w-6 h-6 ${config.color} ${config.spin ? 'animate-spin' : ''}`}
                        />
                      </div>

                      {/* Job Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium truncate">
                          {job.original_filename}
                        </h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-surface-400">
                          <span className="capitalize">{job.status}</span>
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3" />
                            {formatBytes(job.original_file_size)}
                          </span>
                          <span>{new Date(job.created_at).toLocaleString()}</span>
                        </div>

                        {/* Progress Bar */}
                        {(job.status === 'processing' || job.status === 'analyzing') && (
                          <div className="mt-3">
                            <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                              <div
                                className="h-full progress-bar rounded-full transition-all duration-300"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                            <div className="flex justify-between mt-1 text-xs text-surface-500">
                              <span>{job.progress}%</span>
                              {job.current_stage && <span>{job.current_stage}</span>}
                            </div>
                          </div>
                        )}

                        {/* Error Message */}
                        {job.status === 'failed' && job.error_message && (
                          <p className="mt-2 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                            {job.error_message}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {job.status === 'completed' && (
                          <button
                            onClick={() => handleDownload(job.id, job.output_filename || job.original_filename.replace('.mkv', '.mp4'))}
                            disabled={downloadingJobId === job.id}
                            className="p-2 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50"
                            title="Download"
                          >
                            {downloadingJobId === job.id ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Download className="w-5 h-5" />
                            )}
                          </button>
                        )}

                        {['pending', 'queued', 'processing', 'analyzing'].includes(job.status) && (
                          <button
                            onClick={() => cancelJob.mutate(job.id)}
                            className="p-2 rounded-lg text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                            title="Cancel"
                          >
                            <StopCircle className="w-5 h-5" />
                          </button>
                        )}

                        <button
                          onClick={() => deleteJob.mutate(job.id)}
                          className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
