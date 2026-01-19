'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users,
  FileVideo,
  HardDrive,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { StatsCard } from '@/components/admin/StatsCard';

interface DashboardStats {
  users: {
    total: number;
    new_7d: number;
    new_30d: number;
    tier_breakdown: Record<string, number>;
  };
  conversions: {
    total: number;
    last_7d: number;
    last_30d: number;
    active: number;
    success_rate_30d: number;
    status_breakdown: Record<string, number>;
  };
  storage: {
    total_used: number;
    total_limit: number;
    original_files_size: number;
    output_files_size: number;
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function AdminDashboardPage() {
  const params = useParams();
  const lang = params.lang as string || 'en';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError('');

    try {
      const response = await api.get('/api/admin/dashboard/');
      setStats(response.data);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 403) {
        setError('Access denied. You do not have admin privileges.');
      } else if (status === 401) {
        setError('Authentication required. Please log in again.');
      } else {
        setError(err.response?.data?.detail || 'Failed to load dashboard statistics');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="glass rounded-xl p-6 text-center">
        <p className="text-red-400">{error || 'Failed to load data'}</p>
      </div>
    );
  }

  const storagePercentage = stats.storage.total_limit > 0
    ? ((stats.storage.total_used / stats.storage.total_limit) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-surface-400 mt-1">Overview of your application statistics</p>
        </div>
        <button
          onClick={() => fetchStats(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Users"
          value={stats.users.total}
          subtitle={`${stats.users.new_7d} new this week`}
          icon={Users}
          color="primary"
          trend={{
            value: stats.users.new_30d > 0 ? Math.round((stats.users.new_7d / stats.users.new_30d) * 100) : 0,
            label: 'vs last month',
          }}
        />
        <StatsCard
          title="Total Conversions"
          value={stats.conversions.total}
          subtitle={`${stats.conversions.last_7d} this week`}
          icon={FileVideo}
          color="blue"
        />
        <StatsCard
          title="Active Jobs"
          value={stats.conversions.active}
          subtitle="Currently processing"
          icon={Activity}
          color="yellow"
        />
        <StatsCard
          title="Success Rate"
          value={`${stats.conversions.success_rate_30d}%`}
          subtitle="Last 30 days"
          icon={CheckCircle}
          color="green"
        />
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Tiers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">User Tiers</h2>
          <div className="space-y-4">
            {Object.entries(stats.users.tier_breakdown).map(([tier, count]) => {
              const percentage = stats.users.total > 0 ? (count / stats.users.total) * 100 : 0;
              const colors: Record<string, string> = {
                free: 'bg-surface-500',
                pro: 'bg-primary-500',
                enterprise: 'bg-accent-500',
              };
              
              return (
                <div key={tier}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-surface-300 capitalize">{tier}</span>
                    <span className="text-white">{count} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors[tier] || 'bg-primary-500'} rounded-full transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Conversion Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Conversion Status</h2>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(stats.conversions.status_breakdown).map(([status, count]) => {
              const icons: Record<string, React.ReactNode> = {
                completed: <CheckCircle className="w-5 h-5 text-green-400" />,
                failed: <XCircle className="w-5 h-5 text-red-400" />,
                pending: <Clock className="w-5 h-5 text-yellow-400" />,
                queued: <Clock className="w-5 h-5 text-yellow-400" />,
                processing: <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />,
                analyzing: <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />,
                cancelled: <XCircle className="w-5 h-5 text-surface-400" />,
              };
              
              return (
                <div
                  key={status}
                  className="flex items-center gap-3 p-3 bg-surface-800/50 rounded-lg"
                >
                  {icons[status] || <Activity className="w-5 h-5 text-surface-400" />}
                  <div>
                    <p className="text-white font-medium">{count}</p>
                    <p className="text-surface-400 text-xs capitalize">{status}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Storage Usage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Storage Usage</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-surface-400">Total Used</span>
                <span className="text-white">
                  {formatBytes(stats.storage.total_used)} / {formatBytes(stats.storage.total_limit)}
                </span>
              </div>
              <div className="h-3 bg-surface-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all"
                  style={{ width: `${Math.min(Number(storagePercentage), 100)}%` }}
                />
              </div>
              <p className="text-surface-500 text-xs mt-1">{storagePercentage}% used</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-surface-700">
              <div className="flex items-center gap-3">
                <HardDrive className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-white font-medium">{formatBytes(stats.storage.original_files_size)}</p>
                  <p className="text-surface-400 text-xs">Original Files</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <HardDrive className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-white font-medium">{formatBytes(stats.storage.output_files_size)}</p>
                  <p className="text-surface-400 text-xs">Output Files</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a
              href={`/${lang}/admin/users`}
              className="flex items-center gap-3 p-3 bg-surface-800 hover:bg-surface-700 rounded-lg transition-colors"
            >
              <Users className="w-5 h-5 text-primary-400" />
              <span className="text-white">Manage Users</span>
            </a>
            <a
              href={`/${lang}/admin/files`}
              className="flex items-center gap-3 p-3 bg-surface-800 hover:bg-surface-700 rounded-lg transition-colors"
            >
              <FileVideo className="w-5 h-5 text-blue-400" />
              <span className="text-white">View All Files</span>
            </a>
            <a
              href={`/${lang}/admin/settings`}
              className="flex items-center gap-3 p-3 bg-surface-800 hover:bg-surface-700 rounded-lg transition-colors"
            >
              <Activity className="w-5 h-5 text-yellow-400" />
              <span className="text-white">Server Settings</span>
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
