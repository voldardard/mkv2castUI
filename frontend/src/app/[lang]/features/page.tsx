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
  Upload,
  Download,
  Settings,
  Lock,
  Cloud,
  Monitor,
  Smartphone,
  RefreshCw,
  BarChart,
  Eye,
  FileVideo,
  Volume2,
  Subtitles
} from 'lucide-react';

export default function FeaturesPage({ params: { lang } }: { params: { lang: string } }) {
  const t = useTranslations(lang);

  const mainFeatures = [
    {
      icon: <Cpu className="w-8 h-8" />,
      title: t('features.hw.title'),
      description: t('features.hw.desc'),
      details: [
        'VAAPI (Intel/AMD GPU)',
        'Intel Quick Sync (QSV)',
        'CPU (x264/x265)',
        t('features.hw.auto'),
      ],
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: <Eye className="w-8 h-8" />,
      title: t('features.smart.title'),
      description: t('features.smart.desc'),
      details: [
        t('features.smart.detect'),
        t('features.smart.copy'),
        t('features.smart.quality'),
        t('features.smart.integrity'),
      ],
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      icon: <RefreshCw className="w-8 h-8" />,
      title: t('features.realtime.title'),
      description: t('features.realtime.desc'),
      details: [
        'WebSocket',
        t('features.realtime.eta'),
        t('features.realtime.speed'),
        t('features.realtime.status'),
      ],
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: <Lock className="w-8 h-8" />,
      title: t('features.auth.title'),
      description: t('features.auth.desc'),
      details: [
        'OAuth 2.0 (Google, GitHub)',
        t('features.auth.2fa'),
        t('features.auth.local'),
        t('features.auth.admin'),
      ],
      gradient: 'from-orange-500 to-red-500',
    },
  ];

  const mediaFeatures = [
    {
      icon: <FileVideo className="w-6 h-6" />,
      title: t('features.media.video'),
      items: ['H.264', 'HEVC/H.265', 'VP9', 'AV1'],
    },
    {
      icon: <Volume2 className="w-6 h-6" />,
      title: t('features.media.audio'),
      items: ['AAC', 'AC3', 'DTS', 'FLAC', 'Opus'],
    },
    {
      icon: <Subtitles className="w-6 h-6" />,
      title: t('features.media.subs'),
      items: ['SRT', 'ASS/SSA', 'PGS', 'VobSub'],
    },
  ];

  const deploymentOptions = [
    {
      icon: <Server className="w-6 h-6" />,
      title: t('features.deploy.docker'),
      description: t('features.deploy.docker_desc'),
    },
    {
      icon: <Cloud className="w-6 h-6" />,
      title: t('features.deploy.k8s'),
      description: t('features.deploy.k8s_desc'),
    },
    {
      icon: <Monitor className="w-6 h-6" />,
      title: t('features.deploy.local'),
      description: t('features.deploy.local_desc'),
    },
  ];

  const comparison = [
    { feature: t('features.compare.hw'), mkv2cast: true, handbrake: true, ffmpeg: true },
    { feature: t('features.compare.web'), mkv2cast: true, handbrake: false, ffmpeg: false },
    { feature: t('features.compare.smart'), mkv2cast: true, handbrake: false, ffmpeg: false },
    { feature: t('features.compare.chromecast'), mkv2cast: true, handbrake: false, ffmpeg: false },
    { feature: t('features.compare.api'), mkv2cast: true, handbrake: false, ffmpeg: false },
    { feature: t('features.compare.realtime'), mkv2cast: true, handbrake: true, ffmpeg: false },
    { feature: t('features.compare.onprem'), mkv2cast: true, handbrake: true, ffmpeg: true },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950">
      <Header lang={lang} />

      <main className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero */}
        <section className="text-center mb-20">
          <span className="inline-block px-4 py-1.5 bg-accent-500/10 text-accent-400 rounded-full text-sm font-medium mb-6">
            {t('features.badge')}
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            {t('features.title')}
          </h1>
          <p className="text-xl text-surface-400 max-w-3xl mx-auto leading-relaxed">
            {t('features.subtitle')}
          </p>
        </section>

        {/* Main Features Grid */}
        <section className="mb-20">
          <div className="grid md:grid-cols-2 gap-8">
            {mainFeatures.map((feature, index) => (
              <div
                key={index}
                className="glass rounded-2xl p-8 group hover:border-primary-500/30 transition-all"
              >
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-surface-400 mb-6 leading-relaxed">
                  {feature.description}
                </p>
                <ul className="space-y-2">
                  {feature.details.map((detail, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-surface-300">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Media Support */}
        <section className="glass rounded-2xl p-8 md:p-12 mb-20">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            {t('features.media.title')}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {mediaFeatures.map((media, index) => (
              <div key={index} className="text-center">
                <div className="w-14 h-14 rounded-xl bg-surface-800 flex items-center justify-center text-primary-400 mx-auto mb-4">
                  {media.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  {media.title}
                </h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {media.items.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-surface-800 text-surface-300 rounded-full text-sm"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Deployment Options */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            {t('features.deploy.title')}
          </h2>
          <p className="text-surface-400 text-center mb-12 max-w-2xl mx-auto">
            {t('features.deploy.subtitle')}
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {deploymentOptions.map((option, index) => (
              <div
                key={index}
                className="glass rounded-xl p-6 text-center hover:border-primary-500/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-400 mx-auto mb-4">
                  {option.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {option.title}
                </h3>
                <p className="text-surface-400 text-sm">{option.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison Table */}
        <section className="glass rounded-2xl p-8 md:p-12 mb-20">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            {t('features.compare.title')}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-700">
                  <th className="text-left py-4 px-4 text-surface-400 font-medium">
                    {t('features.compare.feature')}
                  </th>
                  <th className="text-center py-4 px-4">
                    <span className="text-primary-400 font-semibold">mkv2cast</span>
                  </th>
                  <th className="text-center py-4 px-4 text-surface-400">HandBrake</th>
                  <th className="text-center py-4 px-4 text-surface-400">FFmpeg CLI</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, index) => (
                  <tr key={index} className="border-b border-surface-800">
                    <td className="py-4 px-4 text-surface-300">{row.feature}</td>
                    <td className="py-4 px-4 text-center">
                      {row.mkv2cast ? (
                        <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                      ) : (
                        <span className="text-surface-600">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {row.handbrake ? (
                        <CheckCircle className="w-5 h-5 text-surface-500 mx-auto" />
                      ) : (
                        <span className="text-surface-600">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {row.ffmpeg ? (
                        <CheckCircle className="w-5 h-5 text-surface-500 mx-auto" />
                      ) : (
                        <span className="text-surface-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            {t('features.cta.title')}
          </h2>
          <p className="text-surface-400 mb-8 max-w-xl mx-auto">
            {t('features.cta.subtitle')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href={`/${lang}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white rounded-xl transition-colors font-medium"
            >
              {t('features.cta.start')}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href={`/${lang}/on-premise`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-surface-800 hover:bg-surface-700 text-white rounded-xl transition-colors"
            >
              {t('features.cta.on_premise')}
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
