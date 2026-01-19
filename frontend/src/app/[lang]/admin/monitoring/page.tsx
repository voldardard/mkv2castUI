'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Cpu,
  Network,
  HardDrive,
  RefreshCw,
  Activity,
  ThermometerSun,
  Gauge,
  Clock3,
  Waves,
  Server,
  Maximize2,
  X,
} from 'lucide-react';
import { useSystemMetrics } from '@/hooks/useSystemMetrics';
import { MetricChart } from '@/components/admin/MetricChart';

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatRate(bytesPerSecond: number): string {
  if (!bytesPerSecond || bytesPerSecond <= 0) return '0 B/s';
  return `${formatBytes(bytesPerSecond)}/s`;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const latestValue = (points: { value: number }[]) =>
  points && points.length ? points[points.length - 1].value : null;

export default function AdminMonitoringPage() {
  const params = useParams();
  const lang = (params.lang as string) || 'en';
  void lang;

  const { snapshot, history, isLoading, error, refresh, usingFallback, setPollInterval, setWindowMs, pollIntervalMs, windowMs } =
    useSystemMetrics(1000, 300000); // 1s poll, 5min default window
  const [showWarning, setShowWarning] = useState(false);
  const [expandedChart, setExpandedChart] = useState<{ type: string; title: string; data: any; color: string; fill: string; unit: string; formatter?: (v: number) => string } | null>(null);

  useEffect(() => {
    if (error || usingFallback) {
      setShowWarning(true);
    }
  }, [error, usingFallback]);

  // Get values with consolidation to avoid flicker (use moving average and filter out 0 values)
  const getConsolidatedValue = useMemo(() => {
    return (points: { value: number }[]) => {
      if (!points || points.length === 0) return null;
      
      // Get last 10 values for better smoothing
      const recentPoints = points.slice(-10);
      const values = recentPoints.map(p => p.value).filter(v => v !== null && v !== undefined);
      
      if (values.length === 0) return null;
      
      // Filter out zeros if we have non-zero values in the history
      const nonZeroValues = values.filter(v => v > 0);
      
      // If we have non-zero values anywhere in history, ignore zeros completely
      if (nonZeroValues.length > 0) {
        // Use exponential moving average: more weight to recent values
        // Start from the most recent and work backwards
        const sortedNonZero = nonZeroValues.reverse(); // Most recent first
        let weightedSum = 0;
        let weightSum = 0;
        
        sortedNonZero.forEach((val, i) => {
          const weight = Math.pow(2, i); // Exponential weight: 1, 2, 4, 8, 16...
          weightedSum += val * weight;
          weightSum += weight;
        });
        
        return weightedSum / weightSum;
      }
      
      // If all values are 0, return null (don't display)
      return null;
    };
  }, []);

  const networkIn = getConsolidatedValue(history.netIn);
  const networkOut = getConsolidatedValue(history.netOut);
  const diskRead = getConsolidatedValue(history.diskRead);
  const diskWrite = getConsolidatedValue(history.diskWrite);


  const temps = useMemo(() => (snapshot?.temperatures || []).slice(0, 4), [snapshot?.temperatures]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm text-primary-300 font-semibold flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            Live Ops
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">Monitoring</h1>
          <p className="text-surface-400 mt-1">
            Télémetrie système détaillée pour anticiper les goulets d&apos;étranglement.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={pollIntervalMs}
            onChange={(e) => setPollInterval(Number(e.target.value))}
            className="bg-surface-800 text-surface-200 text-sm rounded-lg px-3 py-2 border border-surface-700"
          >
            <option value={1000}>1s</option>
            <option value={2000}>2s</option>
            <option value={3000}>3s</option>
            <option value={4000}>4s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
          </select>
          <select
            value={windowMs}
            onChange={(e) => setWindowMs(Number(e.target.value))}
            className="bg-surface-800 text-surface-200 text-sm rounded-lg px-3 py-2 border border-surface-700"
          >
            <option value={60000}>1 min</option>
            <option value={120000}>2 min</option>
            <option value={180000}>3 min</option>
            <option value={300000}>5 min</option>
            <option value={600000}>10 min</option>
            <option value={900000}>15 min</option>
            <option value={1800000}>30 min</option>
            <option value={3600000}>1 h</option>
            <option value={7200000}>2 h</option>
            <option value={10800000}>3 h</option>
            <option value={21600000}>6 h</option>
            <option value={43200000}>12 h</option>
            <option value={86400000}>24 h</option>
          </select>
          {usingFallback && (
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-200 text-xs font-medium">
              Simulation locale
            </span>
          )}
          <button
            onClick={() => refresh()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-white transition-colors disabled:opacity-50"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {error && showWarning && (
        <div className="flex items-start gap-2 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200">
          <Activity className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
          <button
            onClick={() => setShowWarning(false)}
            className="text-amber-200 hover:text-white transition-colors"
            aria-label="Fermer l’alerte"
          >
            ×
          </button>
        </div>
      )}

      {!usingFallback && snapshot ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-surface-400 text-sm font-medium">Charge CPU</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {snapshot ? `${snapshot.cpu.total.toFixed(1)}%` : '--'}
                  </p>
                  <p className="text-surface-500 text-xs mt-1">
                    Load 1m {snapshot?.cpu.load_1.toFixed(2) ?? '--'} ·{' '}
                    {snapshot?.cpu.per_core.length ?? '--'} cœurs
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-primary-500/10 text-primary-400">
                  <Cpu className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-1 relative">
                <button
                  onClick={() => setExpandedChart({
                    type: 'cpu',
                    title: 'CPU Usage',
                    data: history.cpu,
                    color: '#22c55e',
                    fill: 'rgba(34,197,94,0.15)',
                    unit: '%',
                    formatter: (v) => `${v.toFixed(1)}%`,
                  })}
                  className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-surface-800/80 hover:bg-surface-700 text-surface-300 hover:text-white transition-colors"
                  aria-label="Agrandir le graphique"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <MetricChart
                  data={history.cpu}
                  color="#22c55e"
                  fill="rgba(34,197,94,0.15)"
                  windowMs={windowMs}
                  unit="%"
                  formatter={(v) => `${v.toFixed(1)}%`}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-surface-400 text-sm font-medium">Mémoire</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {snapshot ? `${snapshot.memory.percent.toFixed(1)}%` : '--'}
                  </p>
                  <p className="text-surface-500 text-xs mt-1">
                    {snapshot ? `${formatBytes(snapshot.memory.used)} / ${formatBytes(snapshot.memory.total)}` : '—'}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-300">
                  <Server className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-1 relative">
                <button
                  onClick={() => setExpandedChart({
                    type: 'memory',
                    title: 'Mémoire',
                    data: history.memory,
                    color: '#38bdf8',
                    fill: 'rgba(56,189,248,0.15)',
                    unit: '%',
                    formatter: (v) => `${v.toFixed(1)}%`,
                  })}
                  className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-surface-800/80 hover:bg-surface-700 text-surface-300 hover:text-white transition-colors"
                  aria-label="Agrandir le graphique"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <MetricChart
                  data={history.memory}
                  color="#38bdf8"
                  fill="rgba(56,189,248,0.15)"
                  windowMs={windowMs}
                  unit="%"
                  formatter={(v) => `${v.toFixed(1)}%`}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-surface-400 text-sm font-medium">Disque</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {diskRead !== null && diskWrite !== null
                      ? formatRate(diskRead + diskWrite)
                      : '—'}
                  </p>
                  <p className="text-surface-500 text-xs mt-1">
                    {diskRead !== null && diskWrite !== null
                      ? `R ${formatRate(diskRead)} · W ${formatRate(diskWrite)}`
                      : 'En attente de données…'}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-300">
                  <HardDrive className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-1 relative">
                <button
                  onClick={() => setExpandedChart({
                    type: 'disk',
                    title: 'Disque I/O',
                    data: history.diskRead.map((point, idx) => ({
                      timestamp: point.timestamp,
                      value: point.value + (history.diskWrite[idx]?.value || 0),
                    })),
                    color: '#a855f7',
                    fill: 'rgba(168,85,247,0.12)',
                    unit: 'B/s',
                    formatter: (v) => formatRate(v),
                  })}
                  className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-surface-800/80 hover:bg-surface-700 text-surface-300 hover:text-white transition-colors"
                  aria-label="Agrandir le graphique"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <MetricChart
                  data={history.diskRead.map((point, idx) => ({
                    timestamp: point.timestamp,
                    value: point.value + (history.diskWrite[idx]?.value || 0),
                  }))}
                  color="#a855f7"
                  fill="rgba(168,85,247,0.12)"
                  windowMs={windowMs}
                  unit="B/s"
                  formatter={(v) => formatRate(v)}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-surface-400 text-sm font-medium">Réseau</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {networkIn !== null && networkOut !== null
                      ? formatRate(networkIn + networkOut)
                      : '—'}
                  </p>
                  <p className="text-surface-500 text-xs mt-1">
                    {networkIn !== null && networkOut !== null
                      ? `↙ ${formatRate(networkIn)} · ↗ ${formatRate(networkOut)}`
                      : 'En attente de données…'}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-green-500/10 text-green-300">
                  <Network className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-1 relative">
                <button
                  onClick={() => setExpandedChart({
                    type: 'network',
                    title: 'Réseau',
                    data: history.netIn.map((point, idx) => ({
                      timestamp: point.timestamp,
                      value: point.value + (history.netOut[idx]?.value || 0),
                    })),
                    color: '#22c55e',
                    fill: 'rgba(34,197,94,0.12)',
                    unit: 'B/s',
                    formatter: (v) => formatRate(v),
                  })}
                  className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-surface-800/80 hover:bg-surface-700 text-surface-300 hover:text-white transition-colors"
                  aria-label="Agrandir le graphique"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <MetricChart
                  data={history.netIn.map((point, idx) => ({
                    timestamp: point.timestamp,
                    value: point.value + (history.netOut[idx]?.value || 0),
                  }))}
                  color="#22c55e"
                  fill="rgba(34,197,94,0.12)"
                  windowMs={windowMs}
                  unit="B/s"
                  formatter={(v) => formatRate(v)}
                />
              </div>
            </motion.div>
          </div>

          {/* Detailed Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-primary-400" />
                  <h3 className="text-lg font-semibold text-white">CPU Usage</h3>
                </div>
                <button
                  onClick={() => setExpandedChart({
                    type: 'cpu',
                    title: 'CPU Usage',
                    data: history.cpu,
                    color: '#22c55e',
                    fill: 'rgba(34,197,94,0.15)',
                    unit: '%',
                    formatter: (v) => `${v.toFixed(1)}%`,
                  })}
                  className="p-1.5 rounded-lg bg-surface-800/80 hover:bg-surface-700 text-surface-300 hover:text-white transition-colors"
                  aria-label="Agrandir le graphique"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <MetricChart
                data={history.cpu}
                color="#22c55e"
                fill="rgba(34,197,94,0.15)"
                windowMs={windowMs}
                unit="%"
                formatter={(v) => `${v.toFixed(1)}%`}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-blue-300" />
                  <h3 className="text-lg font-semibold text-white">Mémoire</h3>
                </div>
                <button
                  onClick={() => setExpandedChart({
                    type: 'memory',
                    title: 'Mémoire',
                    data: history.memory,
                    color: '#38bdf8',
                    fill: 'rgba(56,189,248,0.15)',
                    unit: '%',
                    formatter: (v) => `${v.toFixed(1)}%`,
                  })}
                  className="p-1.5 rounded-lg bg-surface-800/80 hover:bg-surface-700 text-surface-300 hover:text-white transition-colors"
                  aria-label="Agrandir le graphique"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <MetricChart
                data={history.memory}
                color="#38bdf8"
                fill="rgba(56,189,248,0.15)"
                windowMs={windowMs}
                unit="%"
                formatter={(v) => `${v.toFixed(1)}%`}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-purple-300" />
                  <h3 className="text-lg font-semibold text-white">Disque I/O</h3>
                </div>
                <button
                  onClick={() => setExpandedChart({
                    type: 'disk',
                    title: 'Disque I/O',
                    data: history.diskRead.map((point, idx) => ({
                      timestamp: point.timestamp,
                      value: point.value + (history.diskWrite[idx]?.value || 0),
                    })),
                    color: '#a855f7',
                    fill: 'rgba(168,85,247,0.12)',
                    unit: 'B/s',
                    formatter: (v) => formatRate(v),
                  })}
                  className="p-1.5 rounded-lg bg-surface-800/80 hover:bg-surface-700 text-surface-300 hover:text-white transition-colors"
                  aria-label="Agrandir le graphique"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <MetricChart
                data={history.diskRead.map((point, idx) => ({
                  timestamp: point.timestamp,
                  value: point.value + (history.diskWrite[idx]?.value || 0),
                }))}
                color="#a855f7"
                fill="rgba(168,85,247,0.12)"
                windowMs={windowMs}
                unit="B/s"
                formatter={(v) => formatRate(v)}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Network className="w-5 h-5 text-green-300" />
                  <h3 className="text-lg font-semibold text-white">Réseau</h3>
                </div>
                <button
                  onClick={() => setExpandedChart({
                    type: 'network',
                    title: 'Réseau',
                    data: history.netIn.map((point, idx) => ({
                      timestamp: point.timestamp,
                      value: point.value + (history.netOut[idx]?.value || 0),
                    })),
                    color: '#22c55e',
                    fill: 'rgba(34,197,94,0.12)',
                    unit: 'B/s',
                    formatter: (v) => formatRate(v),
                  })}
                  className="p-1.5 rounded-lg bg-surface-800/80 hover:bg-surface-700 text-surface-300 hover:text-white transition-colors"
                  aria-label="Agrandir le graphique"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <MetricChart
                data={history.netIn.map((point, idx) => ({
                  timestamp: point.timestamp,
                  value: point.value + (history.netOut[idx]?.value || 0),
                }))}
                color="#22c55e"
                fill="rgba(34,197,94,0.12)"
                windowMs={windowMs}
                unit="B/s"
                formatter={(v) => formatRate(v)}
              />
            </motion.div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-surface-400 text-sm font-medium">Détail CPU</p>
                  <p className="text-xl text-white font-semibold">Per-core</p>
                </div>
                <Activity className="w-5 h-5 text-primary-300" />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {(snapshot?.cpu.per_core || []).slice(0, 12).map((usage, idx) => (
                  <div key={idx} className="bg-surface-800/60 rounded-lg p-3">
                    <div className="flex items-center justify-between text-xs text-surface-400">
                      <span>Core {idx + 1}</span>
                      <span className="text-white font-semibold">{usage.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 mt-2 bg-surface-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-green-400"
                        style={{ width: `${usage}%` }}
                      />
                    </div>
                  </div>
                ))}
                {!snapshot && <p className="text-surface-500 text-sm col-span-2">En attente de données…</p>}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-surface-400 text-sm font-medium">Mémoire & Swap</p>
                  <p className="text-xl text-white font-semibold">
                    {snapshot ? `${snapshot.memory.percent.toFixed(1)}% occupé` : '—'}
                  </p>
                </div>
                <Waves className="w-5 h-5 text-blue-300" />
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-surface-400 mb-2">
                    <span>RAM</span>
                    <span className="text-white">
                      {snapshot ? `${formatBytes(snapshot.memory.used)} / ${formatBytes(snapshot.memory.total)}` : '—'}
                    </span>
                  </div>
                  <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-cyan-300"
                      style={{ width: `${snapshot?.memory.percent ?? 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-surface-400 mb-2">
                    <span>Swap</span>
                    <span className="text-white">
                      {snapshot ? `${formatBytes(snapshot.memory.swap_used)} / ${formatBytes(snapshot.memory.swap_total)}` : '—'}
                    </span>
                  </div>
                  <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-400 to-purple-400"
                      style={{ width: `${snapshot?.memory.swap_percent ?? 0}%` }}
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <p className="text-surface-400 text-xs uppercase tracking-wide">Charge 1m/5m/15m</p>
                  <div className="flex gap-3 mt-2 text-white font-semibold">
                    <span>{snapshot?.cpu.load_1.toFixed(2) ?? '--'}</span>
                    <span className="text-surface-400">/</span>
                    <span>{snapshot?.cpu.load_5.toFixed(2) ?? '--'}</span>
                    <span className="text-surface-400">/</span>
                    <span>{snapshot?.cpu.load_15.toFixed(2) ?? '--'}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-surface-400 text-sm font-medium">Thermals & Uptime</p>
                  <p className="text-xl text-white font-semibold">
                    Uptime {formatDuration(snapshot?.uptime_seconds || 0)}
                  </p>
                </div>
                <ThermometerSun className="w-5 h-5 text-amber-300" />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {temps.map((temp, idx) => (
                  <div key={`${temp.label}-${idx}`} className="bg-surface-800/60 rounded-lg p-3">
                    <p className="text-xs text-surface-400">{temp.label}</p>
                    <p className="text-lg text-white font-semibold">{temp.current.toFixed(1)}°C</p>
                    <div className="h-2 mt-2 bg-surface-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-red-400"
                        style={{ width: `${Math.min(temp.current, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
                {temps.length === 0 && (
                  <p className="text-surface-500 text-sm col-span-2">Capteurs indisponibles</p>
                )}
              </div>
              <div className="mt-4 rounded-lg border border-surface-800 bg-surface-900/60 p-3">
                <p className="text-xs text-surface-400">Process / Threads</p>
                <p className="text-white font-semibold mt-1">
                  {snapshot ? `${snapshot.processes.running} actifs / ${snapshot.processes.total} total` : '—'}
                </p>
                <p className="text-surface-500 text-xs">
                  Threads: {snapshot?.processes.threads ?? '—'} · Sleep: {snapshot?.processes.sleeping ?? '—'}
                </p>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass rounded-xl p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-500/10 text-primary-400">
                <Clock3 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-surface-400 text-xs uppercase tracking-wide">Uptime</p>
                <p className="text-white font-semibold text-lg">{formatDuration(snapshot?.uptime_seconds || 0)}</p>
                <p className="text-surface-500 text-xs">
                  Processus: {snapshot?.processes.total ?? '--'}
                </p>
              </div>
            </div>
            <div className="glass rounded-xl p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-300">
                <Network className="w-5 h-5" />
              </div>
              <div>
                <p className="text-surface-400 text-xs uppercase tracking-wide">Flux réseau</p>
                <p className="text-white font-semibold text-lg">
                  {networkIn !== null && networkOut !== null
                    ? formatRate(networkIn + networkOut)
                    : '—'}
                </p>
                <p className="text-surface-500 text-xs">
                  Err in/out: {snapshot?.network.errin ?? 0} / {snapshot?.network.errout ?? 0}
                </p>
              </div>
            </div>
            <div className="glass rounded-xl p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-300">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <p className="text-surface-400 text-xs uppercase tracking-wide">Capacité disque</p>
                <p className="text-white font-semibold text-lg">
                  {snapshot ? `${formatBytes(snapshot.disk.used)} / ${formatBytes(snapshot.disk.total)}` : '—'}
                </p>
                <p className="text-surface-500 text-xs">
                  IOPS: {snapshot?.disk.read_count ?? 0} / {snapshot?.disk.write_count ?? 0}
                </p>
              </div>
            </div>
          </div>

        </>
      ) : (
        <div className="glass rounded-xl p-5 text-surface-300">
          <p className="font-semibold text-white">psutil requis pour afficher les métriques</p>
          <p className="text-sm text-surface-400 mt-1">
            Installe psutil dans le container backend puis relance le refresh pour activer le monitoring.
          </p>
        </div>
      )}

      {/* Expanded Chart Modal */}
      {expandedChart && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setExpandedChart(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="glass rounded-xl p-6 w-full max-w-6xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">{expandedChart.title}</h2>
              <button
                onClick={() => setExpandedChart(null)}
                className="p-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white transition-colors"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="h-[70vh]">
              <MetricChart
                data={expandedChart.data}
                color={expandedChart.color}
                fill={expandedChart.fill}
                windowMs={windowMs}
                unit={expandedChart.unit}
                formatter={expandedChart.formatter}
                className="w-full h-full"
              />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
