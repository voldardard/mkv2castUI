'use client';

import { Download, ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from '@/lib/i18n';

interface DownloadFile {
  id: string;
  filename: string;
  size: number;
  downloadUrl: string;
}

interface DownloadPanelProps {
  files: DownloadFile[];
  lang: string;
}

export function DownloadPanel({ files, lang }: DownloadPanelProps) {
  const t = useTranslations(lang);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = async (file: DownloadFile) => {
    try {
      await navigator.clipboard.writeText(file.downloadUrl);
      setCopiedId(file.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">{t('download.title')}</h3>

      <div className="space-y-3">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-4 p-4 bg-surface-800/50 rounded-xl border border-surface-700"
          >
            {/* File Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{file.filename}</p>
              <p className="text-xs text-surface-500">{formatBytes(file.size)}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Copy Link */}
              <button
                onClick={() => handleCopyLink(file)}
                className="p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700 transition-colors"
                title={t('download.copy_link')}
              >
                {copiedId === file.id ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>

              {/* Open in New Tab */}
              <a
                href={file.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700 transition-colors"
                title={t('download.open_new_tab')}
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              {/* Download */}
              <a
                href={file.downloadUrl}
                download={file.filename}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium">{t('download.download')}</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Download All */}
      {files.length > 1 && (
        <button className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-surface-700 hover:border-primary-500 text-surface-400 hover:text-primary-400 rounded-xl transition-colors">
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">
            {t('download.download_all')} ({files.length})
          </span>
        </button>
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
