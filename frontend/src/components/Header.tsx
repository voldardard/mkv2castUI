'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from '@/lib/i18n';
import { useRequireAuth, useCurrentUser } from '@/hooks/useAuthConfig';
import { 
  Menu, 
  X, 
  Globe, 
  User, 
  LogOut, 
  Home, 
  Shield, 
  Key,
  Book,
  ChevronDown,
  Github,
  Package,
  FileText,
  Server,
  Cpu,
  Info,
  History
} from 'lucide-react';

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
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { requireAuth, config } = useRequireAuth();
  const { data: localUser } = useCurrentUser();
  const t = useTranslations(lang);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [docsMenuOpen, setDocsMenuOpen] = useState(false);

  const currentLang = languages.find((l) => l.code === lang) || languages[0];
  
  // Determine user info based on auth mode
  const isLocalMode = !requireAuth;
  const user = localUser || config?.user || session?.user;
  const isAuthenticated = isLocalMode || !!session || !!localUser;
  const isAdmin = localUser?.is_admin || config?.user?.is_admin || false;

  // Helper to check if a route is active
  const isActiveRoute = (path: string) => {
    if (path === `/${lang}`) {
      return pathname === `/${lang}` || pathname === `/${lang}/`;
    }
    return pathname.startsWith(path);
  };

  // Helper to get nav link classes
  const getNavLinkClasses = (path: string) => {
    const isActive = isActiveRoute(path);
    return `transition-colors ${
      isActive 
        ? 'text-white font-medium border-b-2 border-primary-400 pb-0.5' 
        : 'text-surface-300 hover:text-white'
    }`;
  };

  const handleLogout = async () => {
    // Clear local token
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    // Sign out from NextAuth if using SSO
    if (session) {
      await signOut({ redirect: false });
    }
    setUserMenuOpen(false);
    router.push(`/${lang}/auth/login`);
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setDocsMenuOpen(false);
    };
    if (docsMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [docsMenuOpen]);

  const docsLinks = [
    {
      title: t('nav.about'),
      href: `/${lang}/about`,
      icon: <Info className="w-4 h-4" />,
      internal: true,
    },
    {
      title: t('nav.features'),
      href: `/${lang}/features`,
      icon: <Cpu className="w-4 h-4" />,
      internal: true,
    },
    {
      title: 'On-Premise',
      href: `/${lang}/on-premise`,
      icon: <Server className="w-4 h-4" />,
      internal: true,
    },
    { divider: true },
    {
      title: 'mkv2cast CLI',
      href: 'https://voldardard.github.io/mkv2cast/',
      icon: <Book className="w-4 h-4" />,
      badge: 'Sphinx',
    },
    {
      title: 'mkv2castUI Docs',
      href: 'https://voldardard.github.io/mkv2castUI/',
      icon: <FileText className="w-4 h-4" />,
      badge: 'Sphinx',
    },
    { divider: true },
    {
      title: 'GitHub (CLI)',
      href: 'https://github.com/voldardard/mkv2cast',
      icon: <Github className="w-4 h-4" />,
    },
    {
      title: 'GitHub (UI)',
      href: 'https://github.com/voldardard/mkv2castUI',
      icon: <Github className="w-4 h-4" />,
    },
    {
      title: 'PyPI',
      href: 'https://pypi.org/project/mkv2cast/',
      icon: <Package className="w-4 h-4" />,
    },
  ];

  return (
    <header className="sticky top-0 z-50 glass border-b border-surface-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={`/${lang}`} className="flex items-center gap-2">
            <img
              src="/mkv2cast-logo.svg"
              alt="mkv2cast logo"
              className="w-8 h-8 sm:w-9 sm:h-9"
            />
            <span className="text-xl font-bold text-white hidden sm:block">mkv2cast</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href={`/${lang}`}
              className={getNavLinkClasses(`/${lang}`)}
            >
              {t('nav.convert')}
            </Link>
            <Link
              href={`/${lang}/history`}
              className={getNavLinkClasses(`/${lang}/history`)}
            >
              {t('nav.history')}
            </Link>
            
            {/* Documentation Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDocsMenuOpen(!docsMenuOpen);
                }}
                className="flex items-center gap-1 text-surface-300 hover:text-white transition-colors"
              >
                {t('nav.docs')}
                <ChevronDown className={`w-4 h-4 transition-transform ${docsMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {docsMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDocsMenuOpen(false)} />
                  <div className="absolute left-0 mt-2 w-64 glass-dropdown rounded-xl shadow-xl py-2 animate-fade-in z-20">
                    {docsLinks.map((item, index) => 
                      item.divider ? (
                        <div key={index} className="border-t border-surface-700 my-2" />
                      ) : (
                        item.internal ? (
                          <Link
                            key={index}
                            href={item.href}
                            onClick={() => setDocsMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-surface-300 hover:text-white hover:bg-surface-800 transition-colors"
                          >
                            {item.icon}
                            <span>{item.title}</span>
                          </Link>
                        ) : (
                          <a
                            key={index}
                            href={item.href}
              target="_blank"
              rel="noopener noreferrer"
                            onClick={() => setDocsMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-surface-300 hover:text-white hover:bg-surface-800 transition-colors"
            >
                            {item.icon}
                            <span className="flex-1">{item.title}</span>
                            {item.badge && (
                              <span className="text-xs px-1.5 py-0.5 bg-primary-500/20 text-primary-400 rounded">
                                {item.badge}
                              </span>
                            )}
            </a>
                        )
                      )
                    )}
                  </div>
                </>
              )}
            </div>

            {isAdmin && (
              <Link
                href={`/${lang}/admin`}
                className="flex items-center gap-1 text-primary-400 hover:text-primary-300 transition-colors"
              >
                <Shield className="w-4 h-4" />
                Admin
              </Link>
            )}
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
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setLangMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-40 glass-dropdown-light rounded-xl shadow-xl py-2 animate-fade-in z-20">
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
                </>
              )}
            </div>

            {/* User Menu */}
            {isLocalMode ? (
              /* Local Mode - Show local user indicator */
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <Home className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400 hidden sm:block">Local</span>
              </div>
            ) : isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-800 transition-colors"
                >
                  {(session?.user?.image || localUser?.avatar_url) ? (
                    <img
                      src={session?.user?.image || localUser?.avatar_url || ''}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 glass-dropdown-light rounded-xl shadow-xl py-2 animate-fade-in z-20">
                      <div className="px-4 py-3 border-b border-surface-700">
                        <p className="text-sm font-medium text-white">
                          {user?.username || user?.name || 'User'}
                        </p>
                        <p className="text-xs text-surface-400">
                          {user?.email}
                        </p>
                        {isAdmin && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-primary-500/20 text-primary-400 text-xs rounded">
                            <Shield className="w-3 h-3" />
                            Admin
                          </span>
                        )}
                      </div>
                      
                      {isAdmin && (
                        <Link
                          href={`/${lang}/admin`}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-primary-400 hover:bg-surface-800 transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          Admin Panel
                        </Link>
                      )}
                      
                      <Link
                        href={`/${lang}/profile`}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-surface-300 hover:bg-surface-800 transition-colors"
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                      
                      <Link
                        href={`/${lang}/auth/2fa`}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-surface-300 hover:bg-surface-800 transition-colors"
                      >
                        <Key className="w-4 h-4" />
                        Two-Factor Auth
                      </Link>
                      
                      <div className="border-t border-surface-700 my-1" />
                      
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-surface-800 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('nav.logout')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href={`/${lang}/auth/login`}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
              >
                {t('nav.login')}
              </Link>
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
            
            {/* Mobile Docs Section */}
            <div className="py-3 border-t border-surface-800 mt-2">
              <p className="text-xs text-surface-500 uppercase tracking-wider mb-2">{t('nav.docs')}</p>
              <Link
                href={`/${lang}/about`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-2 text-surface-300 hover:text-white transition-colors"
              >
                <Info className="w-4 h-4" />
                {t('nav.about')}
              </Link>
              <Link
                href={`/${lang}/features`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-2 text-surface-300 hover:text-white transition-colors"
              >
                <Cpu className="w-4 h-4" />
                {t('nav.features')}
              </Link>
              <Link
                href={`/${lang}/on-premise`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-2 text-surface-300 hover:text-white transition-colors"
              >
                <Server className="w-4 h-4" />
                On-Premise
              </Link>
              <Link
                href={`/${lang}/docs`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-2 text-surface-300 hover:text-white transition-colors"
              >
                <Book className="w-4 h-4" />
                {t('nav.docs')}
              </Link>
            </div>

            {/* External Links */}
            <div className="py-3 border-t border-surface-800">
              <p className="text-xs text-surface-500 uppercase tracking-wider mb-2">External</p>
              <a
                href="https://github.com/voldardard/mkv2cast"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 py-2 text-surface-300 hover:text-white transition-colors"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
              <a
                href="https://pypi.org/project/mkv2cast/"
              target="_blank"
              rel="noopener noreferrer"
                className="flex items-center gap-2 py-2 text-surface-300 hover:text-white transition-colors"
            >
                <Package className="w-4 h-4" />
                PyPI
            </a>
            </div>

            {isAdmin && (
              <Link
                href={`/${lang}/admin`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-3 text-primary-400 hover:text-primary-300 transition-colors border-t border-surface-800 mt-2"
              >
                <Shield className="w-4 h-4" />
                Admin Panel
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
