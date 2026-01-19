'use client';

import Link from 'next/link';
import { Header } from '@/components/Header';
import { useTranslations } from '@/lib/i18n';
import { 
  Book, 
  Github, 
  Package, 
  ExternalLink, 
  FileText, 
  Code, 
  Terminal,
  Cpu,
  Server,
  HardDrive
} from 'lucide-react';

interface DocLink {
  title: string;
  description: string;
  url: string;
  icon: React.ReactNode;
  badge?: string;
}

export default function DocsPage({ params: { lang } }: { params: { lang: string } }) {
  const t = useTranslations(lang);

  const cliDocs: DocLink[] = [
    {
      title: 'mkv2cast Documentation',
      description: t('docs.cli.readthedocs_desc'),
      url: 'https://voldardard.github.io/mkv2cast/',
      icon: <Book className="w-6 h-6" />,
      badge: 'GitHub Pages',
    },
    {
      title: 'GitHub Repository',
      description: t('docs.cli.github_desc'),
      url: 'https://github.com/voldardard/mkv2cast',
      icon: <Github className="w-6 h-6" />,
    },
    {
      title: 'PyPI Package',
      description: t('docs.cli.pypi_desc'),
      url: 'https://pypi.org/project/mkv2cast/',
      icon: <Package className="w-6 h-6" />,
      badge: 'pip install mkv2cast',
    },
  ];

  const uiDocs: DocLink[] = [
    {
      title: 'mkv2castUI Documentation',
      description: t('docs.ui.docs_desc'),
      url: 'https://voldardard.github.io/mkv2castUI/',
      icon: <FileText className="w-6 h-6" />,
      badge: 'Sphinx',
    },
    {
      title: 'GitHub Repository',
      description: t('docs.ui.github_desc'),
      url: 'https://github.com/voldardard/mkv2castUI',
      icon: <Github className="w-6 h-6" />,
    },
    {
      title: 'API Reference',
      description: t('docs.ui.api_desc'),
      url: `/${lang}/docs/api`,
      icon: <Code className="w-6 h-6" />,
    },
  ];

  const quickLinks = [
    {
      title: t('docs.quick.install'),
      description: t('docs.quick.install_desc'),
      icon: <Terminal className="w-5 h-5" />,
      url: 'https://voldardard.github.io/mkv2cast/installation.html',
    },
    {
      title: t('docs.quick.hardware'),
      description: t('docs.quick.hardware_desc'),
      icon: <Cpu className="w-5 h-5" />,
      url: 'https://voldardard.github.io/mkv2cast/hardware-acceleration.html',
    },
    {
      title: t('docs.quick.deployment'),
      description: t('docs.quick.deployment_desc'),
      icon: <Server className="w-5 h-5" />,
      url: 'https://voldardard.github.io/mkv2castUI/deployment.html',
    },
    {
      title: t('docs.quick.storage'),
      description: t('docs.quick.storage_desc'),
      icon: <HardDrive className="w-5 h-5" />,
      url: 'https://voldardard.github.io/mkv2castUI/storage.html',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950">
      <Header lang={lang} />

      <main className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero */}
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t('docs.title')}
          </h1>
          <p className="text-lg text-surface-400 max-w-2xl mx-auto">
            {t('docs.subtitle')}
          </p>
        </section>

        {/* Main Documentation Sections */}
        <div className="grid gap-8 lg:grid-cols-2 mb-16">
          {/* mkv2cast CLI */}
          <section className="glass rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Terminal className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">mkv2cast CLI</h2>
                <p className="text-surface-400 text-sm">{t('docs.cli.subtitle')}</p>
              </div>
            </div>

            <div className="space-y-4">
              {cliDocs.map((doc, index) => (
                <a
                  key={index}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 p-4 rounded-xl bg-surface-800/50 hover:bg-surface-800 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-surface-700 flex items-center justify-center text-surface-300 group-hover:text-primary-400 transition-colors">
                    {doc.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white group-hover:text-primary-400 transition-colors">
                        {doc.title}
                      </h3>
                      {doc.badge && (
                        <span className="px-2 py-0.5 text-xs bg-primary-500/20 text-primary-400 rounded-full">
                          {doc.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-surface-400 mt-1">{doc.description}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-surface-500 group-hover:text-primary-400 transition-colors flex-shrink-0" />
                </a>
              ))}
            </div>

            {/* CLI Install Command */}
            <div className="mt-6 p-4 rounded-xl bg-surface-950 border border-surface-800">
              <p className="text-xs text-surface-500 mb-2">{t('docs.cli.install_cmd')}</p>
              <code className="text-primary-400 font-mono text-sm">pip install mkv2cast</code>
            </div>
          </section>

          {/* mkv2castUI */}
          <section className="glass rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Server className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">mkv2castUI</h2>
                <p className="text-surface-400 text-sm">{t('docs.ui.subtitle')}</p>
              </div>
            </div>

            <div className="space-y-4">
              {uiDocs.map((doc, index) => (
                <a
                  key={index}
                  href={doc.url}
                  target={doc.url.startsWith('/') ? '_self' : '_blank'}
                  rel={doc.url.startsWith('/') ? undefined : 'noopener noreferrer'}
                  className="flex items-start gap-4 p-4 rounded-xl bg-surface-800/50 hover:bg-surface-800 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-surface-700 flex items-center justify-center text-surface-300 group-hover:text-primary-400 transition-colors">
                    {doc.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white group-hover:text-primary-400 transition-colors">
                        {doc.title}
                      </h3>
                      {doc.badge && (
                        <span className="px-2 py-0.5 text-xs bg-accent-500/20 text-accent-400 rounded-full">
                          {doc.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-surface-400 mt-1">{doc.description}</p>
                  </div>
                  {doc.url.startsWith('/') ? (
                    <ExternalLink className="w-4 h-4 text-transparent flex-shrink-0" />
                  ) : (
                    <ExternalLink className="w-4 h-4 text-surface-500 group-hover:text-primary-400 transition-colors flex-shrink-0" />
                  )}
                </a>
              ))}
            </div>

            {/* Docker Install Command */}
            <div className="mt-6 p-4 rounded-xl bg-surface-950 border border-surface-800">
              <p className="text-xs text-surface-500 mb-2">{t('docs.ui.docker_cmd')}</p>
              <code className="text-accent-400 font-mono text-sm">docker-compose up -d</code>
            </div>
          </section>
        </div>

        {/* Quick Links */}
        <section className="glass rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6">{t('docs.quick.title')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl bg-surface-800/50 hover:bg-surface-800 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center text-primary-400 group-hover:from-primary-500/30 group-hover:to-accent-500/30 transition-colors">
                  {link.icon}
                </div>
                <div>
                  <h3 className="font-medium text-white text-sm group-hover:text-primary-400 transition-colors">
                    {link.title}
                  </h3>
                  <p className="text-xs text-surface-500">{link.description}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Internal Links */}
        <section className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href={`/${lang}/about`}
            className="px-6 py-3 bg-surface-800 hover:bg-surface-700 text-white rounded-xl transition-colors"
          >
            {t('docs.links.about')}
          </Link>
          <Link
            href={`/${lang}/features`}
            className="px-6 py-3 bg-surface-800 hover:bg-surface-700 text-white rounded-xl transition-colors"
          >
            {t('docs.links.features')}
          </Link>
          <Link
            href={`/${lang}/on-premise`}
            className="px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white rounded-xl transition-colors"
          >
            {t('docs.links.on_premise')}
          </Link>
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
