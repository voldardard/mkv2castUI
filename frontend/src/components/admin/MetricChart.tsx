'use client';

import { useMemo, useId } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

export interface MetricPoint {
  timestamp: number;
  value: number;
}

interface MetricChartProps {
  data: MetricPoint[];
  color?: string;
  fill?: string;
  className?: string;
  windowMs?: number;
  unit?: string;
  formatter?: (value: number) => string;
}

export function MetricChart({
  data,
  color = '#22c55e',
  fill = 'rgba(34,197,94,0.15)',
  className,
  windowMs = 3600000, // 1 hour default
  unit = '',
  formatter,
}: MetricChartProps) {
  const gradientId = useId();
  // Filter data to only show points within the window
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Filter points within the window
    const filtered = data.filter((point) => point.timestamp >= windowStart);
    
    // If we have data but it's all outside the window, show the most recent point
    if (filtered.length === 0 && data.length > 0) {
      return [data[data.length - 1]];
    }
    
    return filtered;
  }, [data, windowMs]);

  // Calculate time domain for X axis
  const timeDomain = useMemo(() => {
    const now = Date.now();
    const windowStart = now - windowMs;
    return [windowStart, now];
  }, [windowMs]);

  // Format data for recharts
  const chartData = useMemo(() => {
    if (filteredData.length === 0) return [];
    
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Add a point at the start of the window if data doesn't start there
    // This ensures the chart shows the full time range
    const dataWithStart = [...filteredData];
    if (filteredData.length > 0 && filteredData[0].timestamp > windowStart) {
      // Add a point at window start with the first value (or 0)
      dataWithStart.unshift({
        timestamp: windowStart,
        value: filteredData[0].value,
      });
    }
    
    // Add a point at the end if needed
    if (dataWithStart.length > 0 && dataWithStart[dataWithStart.length - 1].timestamp < now) {
      const lastValue = dataWithStart[dataWithStart.length - 1].value;
      dataWithStart.push({
        timestamp: now,
        value: lastValue,
      });
    }
    
    return dataWithStart.map((point) => {
      const date = new Date(point.timestamp);
      // Format timestamp for display based on window size
      let timeLabel: string;
      if (windowMs <= 300000) { // 5 min or less
        timeLabel = date.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      } else if (windowMs <= 3600000) { // 1 hour or less
        timeLabel = date.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        });
      } else {
        timeLabel = date.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      
      return {
        timestamp: point.timestamp,
        value: point.value,
        timeLabel,
      };
    });
  }, [filteredData, windowMs]);

  // Format Y-axis values
  const formatYAxis = (value: number) => {
    if (formatter) return formatter(value);
    if (unit === '%') return `${value.toFixed(0)}%`;
    if (unit === 'B/s' || unit === 'bytes') {
      if (value === 0) return '0';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(value) / Math.log(k));
      const formatted = (value / Math.pow(k, i)).toFixed(1);
      return `${formatted} ${sizes[i]}`;
    }
    return value.toFixed(1);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const value = payload[0].value;
      const timestamp = new Date(data.timestamp);
      
      return (
        <div className="bg-surface-800 border border-surface-700 rounded-lg p-3 shadow-xl z-[9999] pointer-events-none">
          <p className="text-surface-400 text-xs mb-1">
            {timestamp.toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </p>
          <p className="text-white font-semibold text-base">
            {formatter ? formatter(value) : formatYAxis(value)}
            {unit && !formatter && unit !== '%' && unit !== 'B/s' && unit !== 'bytes' ? ` ${unit}` : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className || ''}`}>
        <p className="text-surface-500 text-sm">Aucune donnée disponible</p>
      </div>
    );
  }

  return (
    <div className={className || 'w-full h-64'}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 10, left: 10, bottom: 50 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={fill} stopOpacity={0.3} />
              <stop offset="95%" stopColor={fill} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={timeDomain as [number, number]}
            scale="linear"
            stroke="#9CA3AF"
            style={{ fontSize: '11px' }}
            tickFormatter={(value) => {
              if (!value || typeof value !== 'number') return '';
              const date = new Date(value);
              if (isNaN(date.getTime())) return '';
              if (windowMs <= 300000) {
                return date.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });
              }
              return date.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              });
            }}
            interval="preserveStartEnd"
            minTickGap={40}
            angle={-45}
            textAnchor="end"
            height={60}
            allowDataOverflow={false}
          />
          <YAxis
            stroke="#9CA3AF"
            style={{ fontSize: '11px' }}
            tickFormatter={formatYAxis}
            width={60}
          />
          <Tooltip 
            content={<CustomTooltip />}
            cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.5 }}
            allowEscapeViewBox={{ x: true, y: true }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
