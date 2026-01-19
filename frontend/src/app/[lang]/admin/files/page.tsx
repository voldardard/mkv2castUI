'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Trash2,
  FileVideo,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  CheckCircle2,
  Eye,
  EyeOff,
  FileWarning,
  Link2Off,
} from 'lucide-react';
import { api, downloadFile } from '@/lib/api';

interface ConversionFile {
  id: string;
  user: {
    id: number;
    email: string;
    username: string;
  };
  original_filename: string;
  original_file_size: number;
  output_file_size: number;
  status: string;
  container: string;
  hw_backend: string;
  progress: number;
  created_at: string;
  completed_at: string | null;
  task_id?: string | null;
  is_orphaned?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
  pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  queued: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  analyzing: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  processing: { icon: Loader2, color: 'text-primary-400', bg: 'bg-primary-500/10' },
  completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  cancelled: { icon: XCircle, color: 'text-surface-400', bg: 'bg-surface-500/10' },
};

type ViewMode = 'completed' | 'in_progress' | 'failed' | 'all';

export default function AdminFilesPage() {
  const params = useParams();
  const lang = params.lang as string || 'en';

  const [files, setFiles] = useState<ConversionFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('completed');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState({
    completed: 0,
    in_progress: 0,
    failed: 0,
    all: 0,
  });
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchFiles = async () => {
    setIsLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      queryParams.append('view', viewMode);
      queryParams.append('page', page.toString());
      
      const response = await api.get(`/api/admin/files/?${queryParams.toString()}`);
      setFiles(response.data.results || response.data);
      setTotalPages(response.data.total_pages || 1);
      
      // Update counts if provided
      if (response.data.counts) {
        setCounts(response.data.counts);
      } else {
        setCounts(prev => ({
          ...prev,
          [viewMode]: response.data.total || response.data.length || 0,
        }));
      }
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 403) {
        setError('Access denied. You do not have admin privileges.');
      } else if (status === 401) {
        setError('Authentication required. Please log in again.');
      } else {
        setError(err.response?.data?.detail || 'Failed to load files');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, viewMode, page]);

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  };

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(''), 5000);
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file? This will also delete the converted output.')) {
      return;
    }
    
    setDeleteLoading(fileId);
    setError('');
    try {
      await api.delete(`/api/admin/files/${fileId}/`);
      showSuccess('File deleted successfully');
      fetchFiles();
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Failed to delete file');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleDownload = async (fileId: string, filename: string) => {
    setDownloadLoading(fileId);
    try {
      // Use 'en' as default since admin doesn't need language prefix
      await downloadFile('en', fileId, filename);
    } catch (err) {
      console.error('Download failed:', err);
      showError('Failed to download file');
    } finally {
      setDownloadLoading(null);
    }
  };

  const viewModeLabels: Record<ViewMode, { label: string; icon: React.ElementType }> = {
    completed: { label: 'Completed', icon: CheckCircle },
    in_progress: { label: 'In Progress', icon: Loader2 },
    failed: { label: 'Failed/Orphaned', icon: FileWarning },
    all: { label: 'All Files', icon: Eye },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Files</h1>
        <p className="text-surface-400 mt-1">
          Manage uploaded and converted files
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(viewModeLabels) as ViewMode[]).map((mode) => {
          const { label, icon: Icon } = viewModeLabels[mode];
          const isActive = viewMode === mode;
          const count = counts[mode];
          
          return (
            <button
              key={mode}
              onClick={() => {
                setViewMode(mode);
                setPage(1);
              }}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                ${isActive 
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' 
                  : 'bg-surface-800/50 text-surface-400 border border-surface-700 hover:bg-surface-800'
                }
              `}
            >
              <Icon className={`w-4 h-4 ${mode === 'in_progress' && isActive ? 'animate-spin' : ''}`} />
              <span>{label}</span>
              {count > 0 && (
                <span className={`
                  text-xs px-1.5 py-0.5 rounded-full
                  ${isActive ? 'bg-primary-500/30' : 'bg-surface-700'}
                `}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename or user..."
            className="w-full pl-10 pr-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white placeholder-surface-500 focus:border-primary-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Files Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl overflow-hidden"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-surface-400">
            <FileVideo className="w-12 h-12 mb-4" />
            <p>No files found</p>
            <p className="text-sm mt-1">
              {viewMode === 'completed' ? 'No completed conversions yet' : 
               viewMode === 'in_progress' ? 'No files currently processing' :
               viewMode === 'failed' ? 'No failed or orphaned files' :
               'No files in the system'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-800/50">
                    <th className="text-left px-4 py-3 text-surface-400 text-sm font-medium">File</th>
                    <th className="text-left px-4 py-3 text-surface-400 text-sm font-medium">User</th>
                    <th className="text-left px-4 py-3 text-surface-400 text-sm font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-surface-400 text-sm font-medium">Size</th>
                    <th className="text-left px-4 py-3 text-surface-400 text-sm font-medium">Format</th>
                    <th className="text-left px-4 py-3 text-surface-400 text-sm font-medium">Date</th>
                    <th className="text-right px-4 py-3 text-surface-400 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800">
                  {files.map((file) => {
                    const status = statusConfig[file.status] || statusConfig.pending;
                    const StatusIcon = status.icon;
                    const isProcessing = file.status === 'processing' || file.status === 'analyzing';
                    const isOrphaned = file.is_orphaned || (file.status === 'failed' && !file.task_id);
                    
                    return (
                      <tr key={file.id} className={`hover:bg-surface-800/30 transition-colors ${isOrphaned ? 'opacity-75' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${status.bg}`}>
                              <FileVideo className={`w-5 h-5 ${status.color}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-medium truncate max-w-xs flex items-center gap-2" title={file.original_filename}>
                                {file.original_filename}
                                {isOrphaned && (
                                  <span title="Orphaned file - no active task">
                                    <Link2Off className="w-4 h-4 text-yellow-400" />
                                  </span>
                                )}
                              </p>
                              <p className="text-surface-500 text-xs">{file.id.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-white text-sm">{file.user.username}</p>
                            <p className="text-surface-500 text-xs">{file.user.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <StatusIcon className={`w-4 h-4 ${status.color} ${isProcessing ? 'animate-spin' : ''}`} />
                            <span className={`text-sm ${status.color}`}>{file.status}</span>
                            {isProcessing && (
                              <span className="text-surface-500 text-xs">({file.progress}%)</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-white text-sm">{formatBytes(file.original_file_size)}</p>
                            {file.output_file_size > 0 && (
                              <p className="text-surface-500 text-xs">
                                → {formatBytes(file.output_file_size)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-white text-sm uppercase">{file.container}</p>
                            <p className="text-surface-500 text-xs">{file.hw_backend}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-surface-400 text-sm">
                          {new Date(file.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {file.status === 'completed' && file.output_file_size > 0 && (
                              <button
                                onClick={() => handleDownload(file.id, file.original_filename.replace('.mkv', '.mp4'))}
                                disabled={downloadLoading === file.id}
                                className="p-2 text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors disabled:opacity-50"
                                title="Download file"
                              >
                                {downloadLoading === file.id ? (
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                  <Download className="w-5 h-5" />
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(file.id)}
                              disabled={deleteLoading === file.id}
                              className="p-2 text-surface-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete file"
                            >
                              {deleteLoading === file.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Trash2 className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-800">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1 text-surface-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="text-surface-400 text-sm">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-1 text-surface-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
