'use client';

import { FileVideo, X, HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FileListProps {
  files: File[];
  onRemove: (index: number) => void;
}

export function FileList({ files, onRemove }: FileListProps) {
  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {files.map((file, index) => (
          <motion.div
            key={`${file.name}-${file.size}-${index}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            layout
            className="group flex items-center gap-4 p-4 bg-surface-800/50 rounded-xl border border-surface-700 hover:border-surface-600 transition-colors"
          >
            {/* File Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <FileVideo className="w-5 h-5 text-primary-400" />
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{file.name}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-surface-500">
                <HardDrive className="w-3 h-3" />
                <span>{formatBytes(file.size)}</span>
              </div>
            </div>

            {/* Remove Button */}
            <button
              onClick={() => onRemove(index)}
              className="flex-shrink-0 p-2 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Total Size */}
      {files.length > 1 && (
        <div className="flex justify-end pt-2 text-xs text-surface-500">
          <span>
            Total: {formatBytes(files.reduce((sum, f) => sum + f.size, 0))}
          </span>
        </div>
      )}
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
