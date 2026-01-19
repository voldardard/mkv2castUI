'use client';

import Link from 'next/link';
import { Header } from '@/components/Header';
import { useTranslations } from '@/lib/i18n';
import { 
  Zap, 
  Shield, 
  Globe, 
  Cpu, 
  Server, 
  Users, 
  Clock,
  CheckCircle,
  ArrowRight,
  Github,
  Package
} from 'lucide-react';

export default function AboutPage({ params: { lang } }: { params: { lang: string } }) {
  const t = useTranslations(lang);

  const timeline = [
    {
      year: '2024',
      title: t('about.timeline.cli'),
      description: t('about.timeline.cli_desc'),
    },
    {
      year: '2025',
      title: t('about.timeline.ui'),
      description: t('about.timeline.ui_desc'),
    },
    {
      year: '2026',
      title: t('about.timeline.now'),
      description: t('about.timeline.now_desc'),
    },
  ];

  const values = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: t('about.values.privacy'),
      description: t('about.values.privacy_desc'),
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: t('about.values.performance'),
      description: t('about.values.performance_desc'),
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: t('about.values.opensource'),
      description: t('about.values.opensource_desc'),
    },
  ];

  const stats = [
    { value: '5+', label: t('about.stats.languages') },
    { value: '3', label: t('about.stats.hw_backends') },
    { value: '10GB', label: t('about.stats.max_file') },
    { value: '100%', label: t('about.stats.on_premise') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950">
      <Header lang={lang} />

      <main className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero */}
        <section className="text-center mb-20">
          <span className="inline-block px-4 py-1.5 bg-primary-500/10 text-primary-400 rounded-full text-sm font-medium mb-6">
            {t('about.badge')}
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            {t('about.title')}
          </h1>
          <p className="text-xl text-surface-400 max-w-3xl mx-auto leading-relaxed">
            {t('about.subtitle')}
          </p>
        </section>

        {/* What is mkv2cast */}
        <section className="glass rounded-2xl p-8 md:p-12 mb-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">
                {t('about.what.title')}
              </h2>
              <p className="text-surface-300 mb-4 leading-relaxed">
                {t('about.what.p1')}
              </p>
              <p className="text-surface-300 mb-6 leading-relaxed">
                {t('about.what.p2')}
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://github.com/voldardard/mkv2cast"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 text-white rounded-lg transition-colors"
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </a>
                <a
                  href="https://pypi.org/project/mkv2cast/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 text-white rounded-lg transition-colors"
                >
                  <Package className="w-4 h-4" />
                  PyPI
                </a>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-2xl blur-3xl" />
              <div className="relative bg-surface-950 rounded-2xl p-6 border border-surface-800">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <pre className="text-sm font-mono text-surface-300 overflow-x-auto">
                  <code>{`$ pip install mkv2cast

$ mkv2cast convert movie.mkv
[INFO] Analyzing streams...
[INFO] Video: HEVC → H.264 (VAAPI)
[INFO] Audio: DTS → AAC
[INFO] Progress: ████████████ 100%
[INFO] Done: movie_chromecast.mkv`}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="glass rounded-xl p-6 text-center"
            >
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-surface-400">{stat.label}</div>
            </div>
          ))}
        </section>

        {/* Our Values */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            {t('about.values.title')}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="glass rounded-2xl p-8 text-center group hover:border-primary-500/30 transition-colors"
              >
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center text-primary-400 mx-auto mb-6 group-hover:from-primary-500/30 group-hover:to-accent-500/30 transition-colors">
                  {value.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {value.title}
                </h3>
                <p className="text-surface-400 leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="glass rounded-2xl p-8 md:p-12 mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            {t('about.timeline.title')}
          </h2>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-500 via-accent-500 to-primary-500" />
            
            <div className="space-y-12">
              {timeline.map((item, index) => (
                <div
                  key={index}
                  className={`relative flex items-center gap-8 ${
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  {/* Dot */}
                  <div className="absolute left-8 md:left-1/2 w-4 h-4 -ml-2 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 ring-4 ring-surface-900" />
                  
                  {/* Content */}
                  <div className={`ml-20 md:ml-0 md:w-1/2 ${index % 2 === 0 ? 'md:pr-16 md:text-right' : 'md:pl-16'}`}>
                    <span className="text-primary-400 font-mono text-sm">{item.year}</span>
                    <h3 className="text-xl font-semibold text-white mt-1 mb-2">{item.title}</h3>
                    <p className="text-surface-400">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <h2 className="text-2xl font-bold text-white mb-6">
            {t('about.cta.title')}
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href={`/${lang}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white rounded-xl transition-colors font-medium"
            >
              {t('about.cta.try_now')}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href={`/${lang}/features`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-surface-800 hover:bg-surface-700 text-white rounded-xl transition-colors"
            >
              {t('about.cta.features')}
            </Link>
          </div>
        </section>
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
