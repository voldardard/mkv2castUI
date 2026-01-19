'use client';

import Link from 'next/link';
import { Header } from '@/components/Header';
import { useTranslations } from '@/lib/i18n';
import { 
  Shield, 
  Server, 
  Lock, 
  Database,
  Cloud,
  CheckCircle,
  ArrowRight,
  Cpu,
  HardDrive,
  Network,
  Settings,
  Terminal,
  Copy
} from 'lucide-react';
import { useState } from 'react';

export default function OnPremisePage({ params: { lang } }: { params: { lang: string } }) {
  const t = useTranslations(lang);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const benefits = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: t('onprem.benefits.privacy.title'),
      description: t('onprem.benefits.privacy.desc'),
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: <Lock className="w-8 h-8" />,
      title: t('onprem.benefits.control.title'),
      description: t('onprem.benefits.control.desc'),
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: <Database className="w-8 h-8" />,
      title: t('onprem.benefits.data.title'),
      description: t('onprem.benefits.data.desc'),
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: <Cpu className="w-8 h-8" />,
      title: t('onprem.benefits.performance.title'),
      description: t('onprem.benefits.performance.desc'),
      color: 'from-orange-500 to-red-500',
    },
  ];

  const requirements = [
    {
      icon: <Server className="w-5 h-5" />,
      title: t('onprem.req.docker'),
      spec: 'Docker 20.10+ & Docker Compose v2',
    },
    {
      icon: <Cpu className="w-5 h-5" />,
      title: t('onprem.req.cpu'),
      spec: '4 cores (8+ recommandé)',
    },
    {
      icon: <HardDrive className="w-5 h-5" />,
      title: t('onprem.req.ram'),
      spec: '4 GB RAM (8+ recommandé)',
    },
    {
      icon: <HardDrive className="w-5 h-5" />,
      title: t('onprem.req.storage'),
      spec: '20 GB+ (selon vos vidéos)',
    },
    {
      icon: <Network className="w-5 h-5" />,
      title: t('onprem.req.network'),
      spec: 'Port 8080 disponible',
    },
  ];

  const deploymentSteps = [
    {
      step: 1,
      title: t('onprem.steps.clone'),
      cmd: 'git clone https://github.com/voldardard/mkv2castUI.git && cd mkv2castUI',
    },
    {
      step: 2,
      title: t('onprem.steps.config'),
      cmd: 'cp .env.example .env && nano .env',
    },
    {
      step: 3,
      title: t('onprem.steps.localmode'),
      cmd: '# Dans .env, définir:\nREQUIRE_AUTH=false',
    },
    {
      step: 4,
      title: t('onprem.steps.build'),
      cmd: 'docker-compose build',
    },
    {
      step: 5,
      title: t('onprem.steps.start'),
      cmd: 'docker-compose up -d',
    },
  ];

  const copyToClipboard = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd.replace(/^# .*\n/gm, ''));
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950">
      <Header lang={lang} />

      <main className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero */}
        <section className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-500/10 text-green-400 rounded-full text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            {t('onprem.badge')}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            {t('onprem.title')}
          </h1>
          <p className="text-xl text-surface-400 max-w-3xl mx-auto leading-relaxed">
            {t('onprem.subtitle')}
          </p>
        </section>

        {/* Benefits Grid */}
        <section className="mb-20">
          <div className="grid md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="glass rounded-2xl p-8 hover:border-primary-500/30 transition-all"
              >
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${benefit.color} flex items-center justify-center text-white mb-6`}>
                  {benefit.icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  {benefit.title}
                </h3>
                <p className="text-surface-400 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* No Cloud Required */}
        <section className="glass rounded-2xl p-8 md:p-12 mb-20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-500/10 to-transparent rounded-full blur-3xl" />
          <div className="relative grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-sm font-medium mb-4">
                {t('onprem.nocloud.badge')}
              </span>
              <h2 className="text-3xl font-bold text-white mb-6">
                {t('onprem.nocloud.title')}
              </h2>
              <ul className="space-y-4">
                {[
                  t('onprem.nocloud.item1'),
                  t('onprem.nocloud.item2'),
                  t('onprem.nocloud.item3'),
                  t('onprem.nocloud.item4'),
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3 text-surface-300">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                  <div className="w-36 h-36 rounded-full bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                      <Cloud className="w-10 h-10 text-white line-through opacity-50" />
                    </div>
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* System Requirements */}
        <section className="glass rounded-2xl p-8 md:p-12 mb-20">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            {t('onprem.req.title')}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {requirements.map((req, index) => (
              <div
                key={index}
                className="bg-surface-800/50 rounded-xl p-6 text-center"
              >
                <div className="w-12 h-12 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-400 mx-auto mb-4">
                  {req.icon}
                </div>
                <h3 className="font-medium text-white mb-1">{req.title}</h3>
                <p className="text-sm text-surface-400">{req.spec}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Start */}
        <section className="glass rounded-2xl p-8 md:p-12 mb-20">
          <div className="flex items-center gap-3 mb-8">
            <Terminal className="w-6 h-6 text-primary-400" />
            <h2 className="text-3xl font-bold text-white">
              {t('onprem.quickstart')}
            </h2>
          </div>
          
          <div className="space-y-6">
            {deploymentSteps.map((step, index) => (
              <div key={index} className="relative">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-white mb-3">{step.title}</h3>
                    <div className="relative group">
                      <pre className="bg-surface-950 border border-surface-800 rounded-xl p-4 overflow-x-auto">
                        <code className="text-sm font-mono text-surface-300 whitespace-pre-wrap">{step.cmd}</code>
                      </pre>
                      <button
                        onClick={() => copyToClipboard(step.cmd, `step-${step.step}`)}
                        className="absolute top-3 right-3 p-2 bg-surface-800 hover:bg-surface-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {copiedCmd === `step-${step.step}` ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-surface-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-green-500/10 border border-green-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-400 mb-1">{t('onprem.ready')}</h4>
                <p className="text-surface-300 text-sm">
                  {t('onprem.ready_desc')} <code className="text-primary-400">http://localhost:8080</code>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Enterprise */}
        <section className="text-center mb-20">
          <div className="glass rounded-2xl p-8 md:p-12">
            <Settings className="w-12 h-12 text-primary-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">
              {t('onprem.enterprise.title')}
            </h2>
            <p className="text-surface-400 mb-8 max-w-2xl mx-auto">
              {t('onprem.enterprise.desc')}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                t('onprem.enterprise.ldap'),
                t('onprem.enterprise.ha'),
                t('onprem.enterprise.monitoring'),
                t('onprem.enterprise.support'),
              ].map((item, index) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-surface-800 text-surface-300 rounded-lg text-sm"
                >
                  {item}
                </span>
              ))}
            </div>
            <a
              href="mailto:enterprise@mkv2cast.io"
              className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white rounded-xl transition-colors font-medium"
            >
              {t('onprem.enterprise.contact')}
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            {t('onprem.cta.title')}
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href={`/${lang}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white rounded-xl transition-colors font-medium"
            >
              {t('onprem.cta.demo')}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href={`/${lang}/docs`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-surface-800 hover:bg-surface-700 text-white rounded-xl transition-colors"
            >
              {t('onprem.cta.docs')}
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
