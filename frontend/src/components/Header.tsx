'use client';

import { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useTranslations } from '@/lib/i18n';
import { useRequireAuth } from '@/hooks/useAuthConfig';
import { Menu, X, Globe, User, LogOut, Settings, Home } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
];

interface HeaderProps {
  lang: string;
}

export function Header({ lang }: HeaderProps) {
  const { data: session } = useSession();
  const { requireAuth, config } = useRequireAuth();
  const t = useTranslations(lang);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const currentLang = languages.find((l) => l.code === lang) || languages[0];
  
  // In local mode, use the config user info
  const isLocalMode = !requireAuth;
  const localUser = config?.user;

  return (
    <header className="sticky top-0 z-50 glass border-b border-surface-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={`/${lang}`} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">M2C</span>
            </div>
            <span className="text-xl font-bold text-white hidden sm:block">mkv2cast</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href={`/${lang}`}
              className="text-surface-300 hover:text-white transition-colors"
            >
              {t('nav.convert')}
            </Link>
            <Link
              href={`/${lang}/history`}
              className="text-surface-300 hover:text-white transition-colors"
            >
              {t('nav.history')}
            </Link>
            <a
              href="https://mkv2cast.readthedocs.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-surface-300 hover:text-white transition-colors"
            >
              {t('nav.docs')}
            </a>
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-800 transition-colors"
              >
                <Globe className="w-4 h-4 text-surface-400" />
                <span className="text-sm">{currentLang.flag}</span>
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-40 glass rounded-xl shadow-xl py-2 animate-fade-in">
                  {languages.map((language) => (
                    <Link
                      key={language.code}
                      href={`/${language.code}`}
                      onClick={() => setLangMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2 hover:bg-surface-800 transition-colors ${
                        language.code === lang ? 'text-primary-400' : 'text-surface-300'
                      }`}
                    >
                      <span>{language.flag}</span>
                      <span>{language.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* User Menu */}
            {isLocalMode ? (
              /* Local Mode - Show local user indicator */
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <Home className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400 hidden sm:block">Local</span>
              </div>
            ) : session ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-800 transition-colors"
                >
                  {session.user?.image ? (
                    <img
                      src={session.user.image}
                      alt=""
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 glass rounded-xl shadow-xl py-2 animate-fade-in">
                    <div className="px-4 py-3 border-b border-surface-700">
                      <p className="text-sm font-medium text-white">
                        {session.user?.name}
                      </p>
                      <p className="text-xs text-surface-400">
                        {session.user?.email}
                      </p>
                    </div>
                    <Link
                      href={`/${lang}/settings`}
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-surface-300 hover:bg-surface-800 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      {t('nav.settings')}
                    </Link>
                    <button
                      onClick={() => signOut()}
                      className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-surface-800 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => signIn()}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
              >
                {t('nav.login')}
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-surface-800 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-white" />
              ) : (
                <Menu className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-surface-800 animate-slide-up">
            <Link
              href={`/${lang}`}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-3 text-surface-300 hover:text-white transition-colors"
            >
              {t('nav.convert')}
            </Link>
            <Link
              href={`/${lang}/history`}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-3 text-surface-300 hover:text-white transition-colors"
            >
              {t('nav.history')}
            </Link>
            <a
              href="https://mkv2cast.readthedocs.io"
              target="_blank"
              rel="noopener noreferrer"
              className="block py-3 text-surface-300 hover:text-white transition-colors"
            >
              {t('nav.docs')}
            </a>
          </nav>
        )}
      </div>
    </header>
  );
}
