'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useTranslations } from '@/lib/i18n';
import { api } from '@/lib/api';

interface OAuthProvider {
  id: string;
  name: string;
  url: string;
}

export default function LoginPage() {
  const params = useParams();
  const router = useRouter();
  const lang = params.lang as string || 'en';
  const t = useTranslations(lang);

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // OAuth providers
  const [providers, setProviders] = useState<OAuthProvider[] | Record<string, OAuthProvider> | null>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  
  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);

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

  const providerList: OAuthProvider[] = Array.isArray(providers)
    ? providers
    : providers && typeof providers === 'object'
      ? Object.values(providers as Record<string, OAuthProvider>)
      : [];

  const hasGoogle = providerList.some((p) => p.id === 'google');
  const hasGithub = providerList.some((p) => p.id === 'github');
  const hasSSO = hasGoogle || hasGithub;

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post(`/${lang}/api/auth/login/`, {
        email_or_username: emailOrUsername,
        password,
      });

      if (response.data.requires_2fa) {
        setRequires2FA(true);
        setIsLoading(false);
        return;
      }

      // Success - store token and redirect
      localStorage.setItem('token', response.data.token);
      router.push(`/${lang}`);
    } catch (err: any) {
      setError(err.response?.data?.email?.[0] || err.response?.data?.detail || 'Login failed');
      setIsLoading(false);
    }
  };

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post(`/${lang}/api/auth/login/2fa/`, {
        email_or_username: emailOrUsername,
        code: totpCode,
        is_backup_code: isBackupCode,
      });

      // Success - store token and redirect
      localStorage.setItem('token', response.data.token);
      router.push(`/${lang}`);
    } catch (err: any) {
      setError(err.response?.data?.code?.[0] || err.response?.data?.detail || 'Invalid code');
      setIsLoading(false);
    }
  };

  const handleSSOLogin = (provider: 'google' | 'github') => {
    signIn(provider, { callbackUrl: `/${lang}` });
  };

  if (requires2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-surface-950">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="glass rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Two-Factor Authentication</h1>
              <p className="text-surface-400 mt-2">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <form onSubmit={handle2FAVerify} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder={isBackupCode ? 'XXXX-XXXX' : '000000'}
                  className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-center text-2xl tracking-widest focus:border-primary-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBackupCode}
                  onChange={(e) => setIsBackupCode(e.target.checked)}
                  className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-surface-400">Use backup code</span>
              </label>

              <button
                type="submit"
                disabled={isLoading || totpCode.length < 6}
                className="w-full py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setRequires2FA(false);
                  setTotpCode('');
                  setError('');
                }}
                className="w-full text-surface-400 hover:text-white text-sm transition-colors"
              >
                ← Back to login
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-surface-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass rounded-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">{t('login.title')}</h1>
            <p className="text-surface-400 mt-2">{t('login.subtitle')}</p>
          </div>

          {/* Local Login Form - Always shown first */}
          <form onSubmit={handleLocalLogin} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Email or Username
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
                <input
                  type="text"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="you@example.com or username"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-white placeholder-surface-500 focus:border-primary-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-12 py-3 bg-surface-800 border border-surface-700 rounded-xl text-white placeholder-surface-500 focus:border-primary-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                href={`/${lang}/auth/forgot-password`}
                className="text-sm text-primary-400 hover:text-primary-300"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* SSO Options - Only shown if configured */}
          {!isLoadingProviders && hasSSO && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-surface-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-surface-900 text-surface-500">or continue with</span>
                </div>
              </div>

              <div className="space-y-3">
                {hasGoogle && (
                  <button
                    onClick={() => handleSSOLogin('google')}
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

                {hasGithub && (
                  <button
                    onClick={() => handleSSOLogin('github')}
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
            </>
          )}

          <div className="mt-6 text-center">
            <p className="text-surface-400 text-sm">
              Don&apos;t have an account?{' '}
              <Link
                href={`/${lang}/auth/register`}
                className="text-primary-400 hover:text-primary-300 font-medium"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-surface-500">
          {t('login.terms')}
        </p>
      </motion.div>
    </div>
  );
}
