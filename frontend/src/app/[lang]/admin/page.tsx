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
  Cpu,
  Network,
  ThermometerSun,
  Gauge,
  Server,
} from 'lucide-react';
import { api } from '@/lib/api';
import { StatsCard } from '@/components/admin/StatsCard';
import { MetricChart } from '@/components/admin/MetricChart';
import { useSystemMetrics } from '@/hooks/useSystemMetrics';

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

function formatRate(bytesPerSecond: number): string {
  if (!bytesPerSecond || bytesPerSecond <= 0) return '0 B/s';
  return `${formatBytes(bytesPerSecond)}/s`;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const latestValue = (points: { value: number }[]) =>
  points && points.length ? points[points.length - 1].value : 0;

export default function AdminDashboardPage() {
  const params = useParams();
  const lang = params.lang as string || 'en';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const {
    snapshot: systemMetrics,
    history: metricsHistory,
    isLoading: isMetricsLoading,
    error: metricsError,
    refresh: refreshMetrics,
    usingFallback: metricsFallback,
    setPollInterval,
    setWindowMs,
    pollIntervalMs,
    windowMs,
  } = useSystemMetrics(5000, 3600000); // 5s poll, 1h default window
  const [showMetricsWarning, setShowMetricsWarning] = useState(false);

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

  useEffect(() => {
    if (metricsError || metricsFallback) {
      setShowMetricsWarning(true);
    }
  }, [metricsError, metricsFallback]);

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

  const netInRate = latestValue(metricsHistory.netIn);
  const netOutRate = latestValue(metricsHistory.netOut);
  const diskReadRate = latestValue(metricsHistory.diskRead);
  const diskWriteRate = latestValue(metricsHistory.diskWrite);

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
          onClick={() => {
            fetchStats(true);
            refreshMetrics();
          }}
          disabled={isRefreshing || isMetricsLoading}
          className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing || isMetricsLoading ? 'animate-spin' : ''}`} />
          Refresh data
        </button>
      </div>

      {(error || metricsError) && showMetricsWarning && (
        <div className="flex items-start gap-2 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            {error && <p>{error}</p>}
            {metricsError && <p>{metricsError}</p>}
          </div>
          <button
            onClick={() => setShowMetricsWarning(false)}
            className="text-amber-200 hover:text-white transition-colors"
            aria-label="Fermer l’alerte"
          >
            ×
          </button>
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

      {/* System Health */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">System Health</h2>
            <p className="text-surface-400 text-sm">Live CPU, mémoire, disque et réseau</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pollIntervalMs}
              onChange={(e) => setPollInterval(Number(e.target.value))}
              className="bg-surface-800 text-surface-200 text-sm rounded-lg px-3 py-2 border border-surface-700"
            >
              <option value={1000}>1s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
            </select>
            <select
              value={windowMs}
              onChange={(e) => setWindowMs(Number(e.target.value))}
              className="bg-surface-800 text-surface-200 text-sm rounded-lg px-3 py-2 border border-surface-700"
            >
              <option value={300000}>5 min</option>
              <option value={900000}>15 min</option>
              <option value={1800000}>30 min</option>
              <option value={3600000}>1 h</option>
              <option value={21600000}>6 h</option>
              <option value={43200000}>12 h</option>
              <option value={86400000}>24 h</option>
            </select>
            <button
              onClick={() => refreshMetrics()}
              disabled={isMetricsLoading}
              className="flex items-center gap-2 px-3 py-2 bg-surface-800 hover:bg-surface-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isMetricsLoading ? 'animate-spin' : ''}`} />
              Sync metrics
            </button>
          </div>
        </div>

        {!metricsFallback && systemMetrics ? (
          <>
            {/* Current Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-surface-400 text-sm">CPU</p>
                    <p className="text-3xl font-bold text-white">
                      {systemMetrics ? `${systemMetrics.cpu.total.toFixed(1)}%` : '--'}
                    </p>
                    <p className="text-surface-500 text-xs mt-1">
                      Load 1m {systemMetrics?.cpu.load_1.toFixed(2) ?? '--'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-primary-500/10 text-primary-400">
                    <Cpu className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="glass rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-surface-400 text-sm">Mémoire</p>
                    <p className="text-3xl font-bold text-white">
                      {systemMetrics ? `${systemMetrics.memory.percent.toFixed(1)}%` : '--'}
                    </p>
                    <p className="text-surface-500 text-xs mt-1">
                      {systemMetrics
                        ? `${formatBytes(systemMetrics.memory.used)} / ${formatBytes(systemMetrics.memory.total)}`
                        : '—'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-300">
                    <Server className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="glass rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-surface-400 text-sm">Disque</p>
                    <p className="text-2xl font-bold text-white">
                      {formatRate(diskReadRate + diskWriteRate)}
                    </p>
                    <p className="text-surface-500 text-xs mt-1">
                      R {formatRate(diskReadRate)} · W {formatRate(diskWriteRate)}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-300">
                    <HardDrive className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="glass rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-surface-400 text-sm">Réseau</p>
                    <p className="text-2xl font-bold text-white">
                      {formatRate(netInRate + netOutRate)}
                    </p>
                    <p className="text-surface-500 text-xs mt-1">
                      ↙ {formatRate(netInRate)} · ↗ {formatRate(netOutRate)}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-green-500/10 text-green-300">
                    <Network className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="glass rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-primary-400" />
                    <h3 className="text-lg font-semibold text-white">CPU Usage</h3>
                  </div>
                </div>
                <MetricChart
                  data={metricsHistory.cpu}
                  color="#22c55e"
                  fill="rgba(34,197,94,0.15)"
                  windowMs={windowMs}
                  unit="%"
                  formatter={(v) => `${v.toFixed(1)}%`}
                />
              </div>

              <div className="glass rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-blue-300" />
                    <h3 className="text-lg font-semibold text-white">Mémoire</h3>
                  </div>
                </div>
                <MetricChart
                  data={metricsHistory.memory}
                  color="#38bdf8"
                  fill="rgba(56,189,248,0.15)"
                  windowMs={windowMs}
                  unit="%"
                  formatter={(v) => `${v.toFixed(1)}%`}
                />
              </div>

              <div className="glass rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-purple-300" />
                    <h3 className="text-lg font-semibold text-white">Disque I/O</h3>
                  </div>
                </div>
                <MetricChart
                  data={metricsHistory.diskRead.map((point, idx) => ({
                    timestamp: point.timestamp,
                    value: point.value + (metricsHistory.diskWrite[idx]?.value || 0),
                  }))}
                  color="#a855f7"
                  fill="rgba(168,85,247,0.12)"
                  windowMs={windowMs}
                  unit="B/s"
                  formatter={(v) => formatRate(v)}
                />
              </div>

              <div className="glass rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Network className="w-5 h-5 text-green-300" />
                    <h3 className="text-lg font-semibold text-white">Réseau</h3>
                  </div>
                </div>
                <MetricChart
                  data={metricsHistory.netIn.map((point, idx) => ({
                    timestamp: point.timestamp,
                    value: point.value + (metricsHistory.netOut[idx]?.value || 0),
                  }))}
                  color="#22c55e"
                  fill="rgba(34,197,94,0.12)"
                  windowMs={windowMs}
                  unit="B/s"
                  formatter={(v) => formatRate(v)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass rounded-xl p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-500/10 text-primary-400">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-surface-400 text-xs uppercase tracking-wide">Uptime</p>
                  <p className="text-white font-semibold text-lg">
                    {formatDuration(systemMetrics?.uptime_seconds || 0)}
                  </p>
                  <p className="text-surface-500 text-xs">
                    Load 5m {systemMetrics?.cpu.load_5.toFixed(2) ?? '--'}
                  </p>
                </div>
              </div>
              <div className="glass rounded-xl p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-200">
                  <ThermometerSun className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-surface-400 text-xs uppercase tracking-wide">Thermals</p>
                  <p className="text-white font-semibold text-lg">
                    {systemMetrics?.temperatures?.length
                      ? `${Math.max(...systemMetrics.temperatures.map((t) => t.current)).toFixed(1)}°C`
                      : 'N/A'}
                  </p>
                  <p className="text-surface-500 text-xs">capteur le plus chaud</p>
                </div>
              </div>
              <div className="glass rounded-xl p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-300">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-surface-400 text-xs uppercase tracking-wide">Process</p>
                  <p className="text-white font-semibold text-lg">
                    {systemMetrics ? `${systemMetrics.processes.running} actifs` : '--'}
                  </p>
                  <p className="text-surface-500 text-xs">
                    Total {systemMetrics?.processes.total ?? '--'} · Threads {systemMetrics?.processes.threads ?? '--'}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="glass rounded-xl p-4 text-surface-300">
            <p className="font-semibold text-white">Monitoring requis</p>
            <p className="text-sm text-surface-400 mt-1">
              Les métriques système sont masquées tant que psutil n&apos;est pas disponible. Relance un refresh après installation.
            </p>
          </div>
        )}
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
            <a
              href={`/${lang}/admin/monitoring`}
              className="flex items-center gap-3 p-3 bg-surface-800 hover:bg-surface-700 rounded-lg transition-colors"
            >
              <Gauge className="w-5 h-5 text-emerald-400" />
              <span className="text-white">Monitoring avancé</span>
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
