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
import { useRequireAuth, useCurrentUser } from '@/hooks/useAuthConfig';
import { api } from '@/lib/api';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function HomePage({ params: { lang } }: { params: { lang: string } }) {
  const { data: session, status } = useSession();
  const { requireAuth, config } = useRequireAuth();
  const { data: localUser } = useCurrentUser();
  const t = useTranslations(lang);
  const [files, setFiles] = useState<File[]>([]);
  const [options, setOptions] = useState({
    container: 'mkv',
    hw_backend: 'auto',
    preset: 'slow',
    crf: 20,
    audio_bitrate: '192k',
    // Hardware-specific quality
    vaapi_qp: 23,
    qsv_quality: 23,
    nvenc_cq: 23,
    // Codec options
    force_h264: false,
    allow_hevc: false,
    force_aac: false,
    keep_surround: false,
    // Audio/Subtitle selection
    audio_lang: '',
    audio_track: null as number | null,
    subtitle_lang: '',
    subtitle_track: null as number | null,
    prefer_forced_subs: true,
    no_subtitles: false,
    // Optimization
    skip_when_ok: true,
    no_silence: false,
    // Integrity checks
    integrity_check: true,
    deep_check: false,
  });
  const [activeJobs, setActiveJobs] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartConversion = async () => {
    // Determine if user has access (logged in via SSO, local token, or auth disabled)
    const isAuthenticated = !!session || !!localUser || !!config?.user;
    
    if (requireAuth && !isAuthenticated) {
      setUploadError('Please log in to start conversion');
      return;
    }
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadError('');
    setUploadSuccess('');

    const uploadedJobs: string[] = [];
    let hasError = false;

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        Object.entries(options).forEach(([key, value]) => {
          if (value !== null && value !== '' && value !== false) {
            formData.append(key, String(value));
          }
        });

        const response = await api.post(`/${lang}/api/upload/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data?.id) {
          uploadedJobs.push(response.data.id);
        }
      } catch (err: any) {
        hasError = true;
        const errorMsg = err.response?.data?.detail || err.response?.data?.file?.[0] || 'Upload failed';
        setUploadError(errorMsg);
        break;
      }
    }

    setIsUploading(false);

    if (!hasError && uploadedJobs.length > 0) {
      setActiveJobs((prev) => [...prev, ...uploadedJobs]);
      setUploadSuccess(`Successfully uploaded ${uploadedJobs.length} file(s)`);
      setFiles([]);
      setTimeout(() => setUploadSuccess(''), 3000);
    }
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

  // Determine if user has access (logged in via SSO, local token, or auth disabled)
  const isAuthenticated = !!session || !!localUser || !!config?.user;
  const hasAccess = !requireAuth || isAuthenticated;

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

              {/* Messages */}
              {uploadError && (
                <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
              {uploadSuccess && (
                <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {/* Start Button */}
              {files.length > 0 && (
                <button
                  onClick={handleStartConversion}
                  disabled={isUploading}
                  className="w-full py-4 px-6 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      {t('convert.start')} ({files.length} {files.length === 1 ? t('files.file') : t('files.files')})
                    </>
                  )}
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
