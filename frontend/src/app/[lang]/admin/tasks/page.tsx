'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  CheckCircle2,
  Play,
  Square,
  RefreshCw,
  User,
  FileVideo,
  Zap,
  Link2Off,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Task {
  id: string;
  task_id: string | null;
  user: {
    id: number;
    email: string;
    username: string;
  };
  original_filename: string;
  status: string;
  progress: number;
  current_stage: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  error_message: string;
  duration_ms: number;
  is_orphaned: boolean;
}

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Pending' },
  queued: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Queued' },
  analyzing: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Analyzing' },
  processing: { icon: Zap, color: 'text-primary-400', bg: 'bg-primary-500/10', label: 'Processing' },
  completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Failed' },
  cancelled: { icon: Square, color: 'text-surface-400', bg: 'bg-surface-500/10', label: 'Cancelled' },
};

type ViewMode = 'running' | 'completed' | 'failed' | 'all';

export default function AdminTasksPage() {
  const params = useParams();
  const lang = params.lang as string || 'en';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('running');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState({
    running: 0,
    completed: 0,
    failed: 0,
    all: 0,
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      queryParams.append('status', viewMode === 'all' ? '' : viewMode);
      queryParams.append('page', page.toString());
      
      const response = await api.get(`/api/admin/tasks/?${queryParams.toString()}`);
      setTasks(response.data.results || []);
      setTotalPages(response.data.total_pages || 1);
      
      if (response.data.counts) {
        setCounts(response.data.counts);
      }
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 403) {
        setError('Access denied. You do not have admin privileges.');
      } else if (status === 401) {
        setError('Authentication required. Please log in again.');
      } else {
        setError(err.response?.data?.detail || 'Failed to load tasks');
      }
    } finally {
      setIsLoading(false);
    }
  }, [search, viewMode, page]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Auto-refresh for running tasks
  useEffect(() => {
    if (viewMode === 'running') {
      const interval = setInterval(fetchTasks, 5000);
      return () => clearInterval(interval);
    }
  }, [viewMode, fetchTasks]);

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  };

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(''), 5000);
  };

  const handleCancel = async (taskId: string) => {
    if (!confirm('Are you sure you want to cancel this task?')) return;
    
    setActionLoading(taskId);
    try {
      await api.post(`/api/admin/tasks/${taskId}/cancel/`);
      showSuccess('Task cancelled successfully');
      fetchTasks();
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Failed to cancel task');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetry = async (taskId: string) => {
    setActionLoading(taskId);
    try {
      await api.post(`/api/admin/tasks/${taskId}/retry/`);
      showSuccess('Task queued for retry');
      fetchTasks();
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Failed to retry task');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDuration = (ms: number): string => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const getElapsedTime = (startedAt: string | null): string => {
    if (!startedAt) return '-';
    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    return formatDuration(diffMs);
  };

  const viewModeLabels: Record<ViewMode, { label: string; icon: React.ElementType }> = {
    running: { label: 'Running', icon: Zap },
    completed: { label: 'Completed', icon: CheckCircle },
    failed: { label: 'Failed', icon: XCircle },
    all: { label: 'All Tasks', icon: FileVideo },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-surface-400 mt-1">
            Monitor and manage conversion tasks
          </p>
        </div>
        <button
          onClick={fetchTasks}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
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
              <Icon className={`w-4 h-4 ${mode === 'running' && isActive ? 'animate-pulse' : ''}`} />
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

      {/* Tasks List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl overflow-hidden"
      >
        {isLoading && tasks.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-surface-400">
            <FileVideo className="w-12 h-12 mb-4" />
            <p>No tasks found</p>
            <p className="text-sm mt-1">
              {viewMode === 'running' ? 'No active conversions' : 
               viewMode === 'failed' ? 'No failed tasks' :
               viewMode === 'completed' ? 'No completed tasks' :
               'No tasks in the system'}
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
                    <th className="text-left px-4 py-3 text-surface-400 text-sm font-medium">Progress</th>
                    <th className="text-left px-4 py-3 text-surface-400 text-sm font-medium">Started</th>
                    <th className="text-left px-4 py-3 text-surface-400 text-sm font-medium">Duration</th>
                    <th className="text-right px-4 py-3 text-surface-400 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800">
                  {tasks.map((task) => {
                    const config = statusConfig[task.status] || statusConfig.pending;
                    const StatusIcon = config.icon;
                    const isRunning = ['pending', 'queued', 'analyzing', 'processing'].includes(task.status);
                    
                    return (
                      <tr key={task.id} className={`hover:bg-surface-800/30 transition-colors ${task.is_orphaned ? 'opacity-75' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${config.bg}`}>
                              <FileVideo className={`w-5 h-5 ${config.color}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-medium truncate max-w-xs flex items-center gap-2" title={task.original_filename}>
                                {task.original_filename}
                                {task.is_orphaned && (
                                  <span title="Orphaned task - Celery task may be lost">
                                    <Link2Off className="w-4 h-4 text-yellow-400" />
                                  </span>
                                )}
                              </p>
                              <p className="text-surface-500 text-xs">{task.id.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-surface-500" />
                            <div>
                              <p className="text-white text-sm">{task.user.username}</p>
                              <p className="text-surface-500 text-xs">{task.user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <StatusIcon className={`w-4 h-4 ${config.color} ${isRunning ? 'animate-spin' : ''}`} />
                            <span className={`text-sm ${config.color}`}>{config.label}</span>
                            {task.current_stage && isRunning && (
                              <span className="text-surface-500 text-xs">({task.current_stage})</span>
                            )}
                          </div>
                          {task.error_message && (
                            <p className="text-red-400 text-xs mt-1 truncate max-w-[200px]" title={task.error_message}>
                              {task.error_message}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isRunning ? (
                            <div className="w-24">
                              <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary-500 rounded-full transition-all duration-300"
                                  style={{ width: `${task.progress}%` }}
                                />
                              </div>
                              <p className="text-surface-400 text-xs mt-1">{task.progress}%</p>
                            </div>
                          ) : (
                            <span className="text-surface-500 text-sm">
                              {task.status === 'completed' ? '100%' : '-'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-surface-400 text-sm">
                          {task.started_at ? (
                            <div>
                              <p>{new Date(task.started_at).toLocaleTimeString()}</p>
                              <p className="text-xs text-surface-500">
                                {new Date(task.started_at).toLocaleDateString()}
                              </p>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-surface-400 text-sm">
                          {isRunning ? (
                            <span className="text-primary-400">{getElapsedTime(task.started_at)}</span>
                          ) : task.completed_at && task.started_at ? (
                            formatDuration(new Date(task.completed_at).getTime() - new Date(task.started_at).getTime())
                          ) : (
                            formatDuration(task.duration_ms)
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isRunning && (
                              <button
                                onClick={() => handleCancel(task.id)}
                                disabled={actionLoading === task.id}
                                className="p-2 text-surface-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                title="Cancel task"
                              >
                                {actionLoading === task.id ? (
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                  <Square className="w-5 h-5" />
                                )}
                              </button>
                            )}
                            {(task.status === 'failed' || task.status === 'cancelled') && (
                              <button
                                onClick={() => handleRetry(task.id)}
                                disabled={actionLoading === task.id}
                                className="p-2 text-surface-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors disabled:opacity-50"
                                title="Retry task"
                              >
                                {actionLoading === task.id ? (
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                  <Play className="w-5 h-5" />
                                )}
                              </button>
                            )}
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
