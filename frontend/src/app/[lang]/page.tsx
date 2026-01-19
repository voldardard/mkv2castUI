'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/Header';
import { FileUploader } from '@/components/FileUploader';
import { ConversionOptions } from '@/components/ConversionOptions';
import { FileList } from '@/components/FileList';
import { ProgressTracker } from '@/components/ProgressTracker';
import { LoginPrompt } from '@/components/LoginPrompt';
import { useTranslations } from '@/lib/i18n';
import { useRequireAuth } from '@/hooks/useAuthConfig';

export default function HomePage({ params: { lang } }: { params: { lang: string } }) {
  const { data: session, status } = useSession();
  const { requireAuth } = useRequireAuth();
  const t = useTranslations(lang);
  const [files, setFiles] = useState<File[]>([]);
  const [options, setOptions] = useState({
    container: 'mkv',
    hw_backend: 'auto',
    preset: 'slow',
    crf: 20,
    audio_bitrate: '192k',
    force_h264: false,
    allow_hevc: false,
    force_aac: false,
    keep_surround: false,
    integrity_check: true,
    deep_check: false,
  });
  const [activeJobs, setActiveJobs] = useState<string[]>([]);

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartConversion = async () => {
    // Allow conversion if auth is disabled OR user is logged in
    if (requireAuth && !session) return;
    if (files.length === 0) return;

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      Object.entries(options).forEach(([key, value]) => {
        formData.append(key, String(value));
      });

      try {
        const response = await fetch(`/${lang}/api/upload/`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const job = await response.json();
          setActiveJobs((prev) => [...prev, job.id]);
        }
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }

    setFiles([]);
  };

  // Only show loading if auth is required AND session is loading
  // If auth is disabled, skip the loading state entirely
  if (requireAuth && status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Determine if user has access (logged in OR auth disabled)
  const hasAccess = !requireAuth || session;

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950">
      <Header lang={lang} />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 bg-clip-text text-transparent mb-4">
            {t('hero.title')}
          </h1>
          <p className="text-lg text-surface-400 max-w-2xl mx-auto">
            {t('hero.subtitle')}
          </p>
          {/* Show local mode indicator */}
          {!requireAuth && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Mode local - Authentification désactivée
            </div>
          )}
        </section>

        {!hasAccess ? (
          <LoginPrompt lang={lang} />
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Upload & Options Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* File Uploader */}
              <section className="glass rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  {t('upload.title')}
                </h2>
                <FileUploader
                  onFilesSelected={handleFilesSelected}
                  lang={lang}
                />
              </section>

              {/* Files List */}
              {files.length > 0 && (
                <section className="glass rounded-2xl p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">
                    {t('files.selected')} ({files.length})
                  </h2>
                  <FileList files={files} onRemove={handleRemoveFile} />
                </section>
              )}

              {/* Conversion Options */}
              <section className="glass rounded-2xl p-6">
                <ConversionOptions
                  options={options}
                  onChange={setOptions}
                  lang={lang}
                />
              </section>

              {/* Start Button */}
              {files.length > 0 && (
                <button
                  onClick={handleStartConversion}
                  className="w-full py-4 px-6 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-primary-500/25"
                >
                  {t('convert.start')} ({files.length} {files.length === 1 ? t('files.file') : t('files.files')})
                </button>
              )}
            </div>

            {/* Progress Column */}
            <div className="space-y-6">
              <section className="glass rounded-2xl p-6 sticky top-4">
                <h2 className="text-xl font-semibold text-white mb-4">
                  {t('progress.title')}
                </h2>
                <ProgressTracker jobIds={activeJobs} lang={lang} />
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-800 mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-surface-500 text-sm">
          <p>
            mkv2cast UI &copy; {new Date().getFullYear()} — {t('footer.powered_by')}{' '}
            <a
              href="https://github.com/voldardard/mkv2cast"
              className="text-primary-400 hover:text-primary-300 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              mkv2cast
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
