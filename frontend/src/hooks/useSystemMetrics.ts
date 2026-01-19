'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

export interface MetricPoint {
  timestamp: number;
  value: number;
}

export interface SystemMetricsSnapshot {
  timestamp: string;
  available?: boolean;
  error?: string;
  detail?: string;
  cpu: {
    total: number;
    per_core: number[];
    load_1: number;
    load_5: number;
    load_15: number;
  };
  memory: {
    total: number;
    used: number;
    available: number;
    percent: number;
    swap_total: number;
    swap_used: number;
    swap_percent: number;
  };
  disk: {
    total: number;
    used: number;
    percent: number;
    read_bytes: number;
    write_bytes: number;
    read_count: number;
    write_count: number;
  };
  network: {
    bytes_sent: number;
    bytes_recv: number;
    packets_sent: number;
    packets_recv: number;
    errin: number;
    errout: number;
  };
  uptime_seconds: number;
  temperatures: { label: string; current: number }[];
  processes: { total: number; running: number; sleeping: number; threads: number };
}

export interface SystemMetricsHistory {
  cpu: MetricPoint[];
  memory: MetricPoint[];
  load: MetricPoint[];
  diskRead: MetricPoint[];
  diskWrite: MetricPoint[];
  netIn: MetricPoint[];
  netOut: MetricPoint[];
}

// ---------------------------------------------------------------------------
// Shared polling state (singleton)
// ---------------------------------------------------------------------------

type Listener = (payload: { data: SystemMetricsSnapshot | null; error: string | null; loading: boolean }) => void;

const listeners = new Set<Listener>();
let sharedPollMs = 5000;
let sharedTimer: ReturnType<typeof setTimeout> | null = null;
let sharedInFlight = false;
let lastFetchTs = 0;
let lastData: SystemMetricsSnapshot | null = null;
let lastError: string | null = null;
let sharedBurstRemaining = 0; // number of extra fast polls (1s apart) after the first

const clampHistory = (points: MetricPoint[], limit: number) =>
  limit > 0 && points.length > limit ? points.slice(points.length - limit) : points;

const notify = (payload: { data: SystemMetricsSnapshot | null; error: string | null; loading: boolean }) => {
  listeners.forEach((fn) => fn(payload));
};

const stopSharedTimer = () => {
  if (sharedTimer) {
    clearTimeout(sharedTimer);
    sharedTimer = null;
  }
};

const scheduleNext = (delay?: number) => {
  stopSharedTimer();
  sharedTimer = setTimeout(() => fetchShared(false), delay ?? sharedPollMs);
};

const fetchShared = async (force: boolean) => {
  const now = Date.now();
  if (!force && now - lastFetchTs < sharedPollMs - 20) {
    scheduleNext(sharedPollMs - (now - lastFetchTs));
    return;
  }
  if (sharedInFlight) return;

  sharedInFlight = true;
  notify({ data: lastData, error: lastError, loading: true });

  try {
    const response = await api.get('/api/admin/monitoring/');
    const data: SystemMetricsSnapshot = response.data;

    if (data?.available === false) {
      lastError = data.error || 'Monitoring indisponible';
      lastData = null;
    } else {
      lastData = data;
      lastError = null;
      lastFetchTs = Date.now();
    }
    notify({ data: lastData, error: lastError, loading: false });
  } catch (err: any) {
    lastError = err?.response?.data?.error || 'Monitoring API indisponible (psutil manquant ?). Actualise pour réessayer.';
    notify({ data: lastData, error: lastError, loading: false });
  } finally {
    sharedInFlight = false;
    if (sharedBurstRemaining > 0) {
      sharedBurstRemaining -= 1;
      scheduleNext(1000);
    } else {
      scheduleNext();
    }
  }
};

const startPolling = () => {
  if (!sharedTimer) {
    sharedBurstRemaining = 2; // two quick follow-ups (1s spaced) after first call
    scheduleNext(0);
  }
};

const setSharedPollInterval = (ms: number, force = false) => {
  sharedPollMs = Math.max(ms, 1000);
  sharedBurstRemaining = 2;
  if (force) {
    fetchShared(true);
  } else {
    scheduleNext(0);
  }
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSystemMetrics(defaultPoll = 12000, defaultWindowMs = 3600000) {
  const [snapshot, setSnapshot] = useState<SystemMetricsSnapshot | null>(null);
  const [history, setHistory] = useState<SystemMetricsHistory>({
    cpu: [],
    memory: [],
    load: [],
    diskRead: [],
    diskWrite: [],
    netIn: [],
    netOut: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [usingFallback, setUsingFallback] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(240); // number of points to keep
  const [pollIntervalState, setPollIntervalState] = useState(sharedPollMs);
  const [windowMs, setWindowMsState] = useState(defaultWindowMs);
  const snapshotRef = useRef<SystemMetricsSnapshot | null>(null);

  useEffect(() => {
    setSharedPollInterval(defaultPoll);
    setPollIntervalState(Math.max(defaultPoll, 1000));
    const listener: Listener = ({ data, error: err, loading }) => {
      if (typeof err === 'string') {
        setError(err);
        setUsingFallback(true);
      } else {
        setError('');
        setUsingFallback(false);
      }
      setIsLoading(loading && !data);

      if (data && data.available !== false) {
        const ts = Date.parse(data.timestamp || new Date().toISOString());
        const prevSnapshot = snapshotRef.current;
        const elapsedSeconds = prevSnapshot
          ? Math.max(1, (ts - Date.parse(prevSnapshot.timestamp)) / 1000)
          : Math.max(1, sharedPollMs / 1000);

        snapshotRef.current = data;
        setSnapshot(data);
        setHistory((prev) => {
          // Calculate rates only if we have previous data, otherwise keep last known rate
          const lastDiskRead = prev.diskRead.length > 0 ? prev.diskRead[prev.diskRead.length - 1]?.value || 0 : 0;
          const lastDiskWrite = prev.diskWrite.length > 0 ? prev.diskWrite[prev.diskWrite.length - 1]?.value || 0 : 0;
          const lastNetIn = prev.netIn.length > 0 ? prev.netIn[prev.netIn.length - 1]?.value || 0 : 0;
          const lastNetOut = prev.netOut.length > 0 ? prev.netOut[prev.netOut.length - 1]?.value || 0 : 0;

          const diskReadRate = prevSnapshot
            ? Math.max(0, (data.disk.read_bytes - prevSnapshot.disk.read_bytes) / elapsedSeconds)
            : lastDiskRead;
          const diskWriteRate = prevSnapshot
            ? Math.max(0, (data.disk.write_bytes - prevSnapshot.disk.write_bytes) / elapsedSeconds)
            : lastDiskWrite;
          const netInRate = prevSnapshot
            ? Math.max(0, (data.network.bytes_recv - prevSnapshot.network.bytes_recv) / elapsedSeconds)
            : lastNetIn;
          const netOutRate = prevSnapshot
            ? Math.max(0, (data.network.bytes_sent - prevSnapshot.network.bytes_sent) / elapsedSeconds)
            : lastNetOut;

          return {
            cpu: clampHistory([...prev.cpu, { timestamp: ts, value: data.cpu.total }], historyLimit),
            memory: clampHistory([...prev.memory, { timestamp: ts, value: data.memory.percent }], historyLimit),
            load: clampHistory([...prev.load, { timestamp: ts, value: data.cpu.load_1 }], historyLimit),
            diskRead: clampHistory([...prev.diskRead, { timestamp: ts, value: diskReadRate }], historyLimit),
            diskWrite: clampHistory([...prev.diskWrite, { timestamp: ts, value: diskWriteRate }], historyLimit),
            netIn: clampHistory([...prev.netIn, { timestamp: ts, value: netInRate }], historyLimit),
            netOut: clampHistory([...prev.netOut, { timestamp: ts, value: netOutRate }], historyLimit),
          };
        });
      }
    };

    const wasEmpty = listeners.size === 0;
    listeners.add(listener);
    if (wasEmpty) {
      const initialPoll = defaultPoll || 5000;
      setSharedPollInterval(initialPoll, true);
      setPollIntervalState(Math.max(initialPoll, 1000));
    } else {
      setPollIntervalState(sharedPollMs);
    }
    startPolling();
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        stopSharedTimer();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep window duration consistent when poll interval changes
  useEffect(() => {
    const points = Math.max(1, Math.ceil(windowMs / pollIntervalState));
    setHistoryLimit(points);
  }, [pollIntervalState, windowMs]);

  return {
    snapshot,
    history,
    isLoading,
    error,
    usingFallback,
    refresh: () => fetchShared(true),
    setPollInterval: (ms: number) => {
      const clamped = Math.max(ms, 1000);
      setPollIntervalState(clamped);
      setSharedPollInterval(clamped, true);
    },
    setWindowMs: (ms: number) => {
      const windowValue = Math.max(ms, pollIntervalState);
      setWindowMsState(windowValue);
      const points = Math.max(1, Math.ceil(windowValue / pollIntervalState));
      setHistoryLimit(points);
    },
    pollIntervalMs: pollIntervalState,
    windowMs,
    setHistoryLimit: (limit: number) => setHistoryLimit(Math.max(limit, 0)),
  };
}
