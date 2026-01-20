'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { useRequireAuth, useCurrentUser } from '@/hooks/useAuthConfig';
import { api } from '@/lib/api';
import { Mail, Loader2 } from 'lucide-react';

interface LoginPromptProps {
  lang: string;
}

interface OAuthProvider {
  id: string;
  name: string;
  url: string;
}

export function LoginPrompt({ lang }: LoginPromptProps) {
  const t = useTranslations(lang);
  const router = useRouter();
  const { requireAuth, config } = useRequireAuth();
  const { data: session } = useSession();
  const { data: localUser } = useCurrentUser();
  const [providers, setProviders] = useState<OAuthProvider[] | Record<string, OAuthProvider> | null>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);

  // Fetch available OAuth providers
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await api.get(`/${lang}/api/auth/providers/`);
        setProviders(response.data);
      } catch (err) {
        console.error('Failed to fetch OAuth providers:', err);
        setProviders([]);
      } finally {
        setIsLoadingProviders(false);
      }
    };

    fetchProviders();
  }, []);

  // Auth is disabled - user is automatically logged in as local user
  if (!requireAuth) {
    return null;
  }

  // Check if user is authenticated (SSO session or local user with token)
  const isAuthenticated = !!session || !!localUser || !!config?.user;

  // Don't show if user is already logged in
  if (isAuthenticated) {
    return null;
  }

  const providerList: OAuthProvider[] = Array.isArray(providers)
    ? providers
    : providers && typeof providers === 'object'
      ? Object.values(providers as Record<string, OAuthProvider>)
      : [];

  const hasGoogle = providerList.some((p) => p.id === 'google');
  const hasGithub = providerList.some((p) => p.id === 'github');

  const handleLocalLogin = () => {
    router.push(`/${lang}/auth/login`);
  };

  return (
    <>
      {/* Backdrop overlay that blocks all interaction */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full glass rounded-2xl p-8 text-center relative z-10"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">{t('login.title')}</h2>
          <p className="text-surface-400 mb-8">{t('login.subtitle')}</p>

          {isLoadingProviders ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Local Login - Always shown */}
              <button
                onClick={handleLocalLogin}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-gradient-to-r from-primary-500 to-accent-500 hover:opacity-90 text-white rounded-xl transition-all"
              >
                <Mail className="w-5 h-5" />
                <span className="font-medium">{t('login.email') || 'Sign in with Email'}</span>
              </button>

              {/* SSO Divider - Only show if there are SSO providers */}
              {(hasGoogle || hasGithub) && (
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-surface-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-surface-900 text-surface-500">or continue with</span>
                  </div>
                </div>
              )}

              {/* Google Sign In - Only if configured */}
              {hasGoogle && (
                <button
                  onClick={() => signIn('google')}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-gray-100 text-gray-800 rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="font-medium">{t('login.google')}</span>
                </button>
              )}

              {/* GitHub Sign In - Only if configured */}
              {hasGithub && (
                <button
                  onClick={() => signIn('github')}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-surface-800 hover:bg-surface-700 text-white rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium">{t('login.github')}</span>
                </button>
              )}
            </div>
          )}

          <p className="mt-6 text-xs text-surface-500">{t('login.terms')}</p>
        </motion.div>
      </div>
    </>
  );
}
