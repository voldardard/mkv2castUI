'use client';

import { useId } from 'react';

interface SparklineProps {
  data: { timestamp: number; value: number }[];
  color?: string;
  fill?: string;
  className?: string;
}

export function Sparkline({ data, color = '#22c55e', fill = 'rgba(34,197,94,0.15)', className }: SparklineProps) {
  const gradientId = useId();
  const width = 160;
  const height = 60;

  const safeData = data && data.length ? data : [{ timestamp: 0, value: 0 }];
  const values = safeData.map((point) => point.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const points = safeData.map((point, index) => {
    const x = (index / Math.max(safeData.length - 1, 1)) * width;
    const y = height - ((point.value - minVal) / range) * height;
    return { x, y };
  });

  const pathD = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');

  const areaD = [
    `M 0 ${height}`,
    ...points.map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`),
    `L ${width} ${height}`,
    'Z',
  ].join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className || 'w-full h-16'}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={fill} stopOpacity="1" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
