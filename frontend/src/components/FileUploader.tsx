'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileVideo, AlertCircle } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  lang: string;
  maxSize?: number; // bytes
}

export function FileUploader({
  onFilesSelected,
  lang,
  maxSize = 10 * 1024 * 1024 * 1024, // 10GB default
}: FileUploaderProps) {
  const t = useTranslations(lang);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null);

      if (rejectedFiles.length > 0) {
        const errors = rejectedFiles.map((f) => {
          if (f.errors[0]?.code === 'file-too-large') {
            return t('upload.error.too_large');
          }
          if (f.errors[0]?.code === 'file-invalid-type') {
            return t('upload.error.invalid_type');
          }
          return f.errors[0]?.message;
        });
        setError(errors[0]);
        return;
      }

      if (acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles);
      }
    },
    [onFilesSelected, t]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'video/x-matroska': ['.mkv'],
    },
    maxSize,
    multiple: true,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 md:p-12 transition-all duration-300 cursor-pointer
          ${
            isDragActive && !isDragReject
              ? 'border-primary-500 bg-primary-500/10'
              : isDragReject
              ? 'border-red-500 bg-red-500/10'
              : 'border-surface-600 hover:border-surface-500 hover:bg-surface-800/50'
          }
        `}
      >
        <input {...getInputProps()} />

        <motion.div
          className="flex flex-col items-center text-center"
          animate={{ scale: isDragActive ? 1.02 : 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <motion.div
            className={`
              w-16 h-16 rounded-full flex items-center justify-center mb-4
              ${isDragActive ? 'bg-primary-500/20' : 'bg-surface-800'}
            `}
            animate={{ y: isDragActive ? -5 : 0 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {isDragReject ? (
              <AlertCircle className="w-8 h-8 text-red-400" />
            ) : (
              <Upload
                className={`w-8 h-8 ${isDragActive ? 'text-primary-400' : 'text-surface-400'}`}
              />
            )}
          </motion.div>

          <h3 className="text-lg font-medium text-white mb-2">
            {isDragActive
              ? isDragReject
                ? t('upload.drop_reject')
                : t('upload.drop_here')
              : t('upload.drag_drop')}
          </h3>

          <p className="text-sm text-surface-400 mb-4">
            {t('upload.or')}{' '}
            <span className="text-primary-400 hover:text-primary-300">
              {t('upload.browse')}
            </span>
          </p>

          <div className="flex items-center gap-4 text-xs text-surface-500">
            <div className="flex items-center gap-1">
              <FileVideo className="w-4 h-4" />
              <span>MKV</span>
            </div>
            <span>•</span>
            <span>{t('upload.max_size', { size: formatBytes(maxSize) })}</span>
          </div>
        </motion.div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
