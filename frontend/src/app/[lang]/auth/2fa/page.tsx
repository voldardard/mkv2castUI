'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Loader2, AlertCircle, Copy, Check, KeyRound } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';
import { useCurrentUser, useRequireAuth } from '@/hooks/useAuthConfig';

export default function TwoFactorPage() {
  const params = useParams();
  const router = useRouter();
  const lang = params.lang as string || 'en';
  const { data: session, status: sessionStatus } = useSession();
  const { data: localUser, isLoading: localUserLoading } = useCurrentUser();
  const { requireAuth } = useRequireAuth();

  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Setup state
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  
  // Verify state
  const [verifyCode, setVerifyCode] = useState('');
  
  // Backup codes state
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication - support both SSO and local token
  useEffect(() => {
    const checkAuth = async () => {
      // If auth is disabled, allow access
      if (!requireAuth) {
        setIsCheckingAuth(false);
        return;
      }

      // Check if user is authenticated via SSO or local token
      const hasSession = sessionStatus === 'authenticated' && !!session;
      const hasToken = !!localUser;

      if (!hasSession && !hasToken) {
        // Wait a bit for localUser to load
        if (sessionStatus === 'loading' || localUserLoading) {
          return;
        }
        router.push(`/${lang}/auth/login`);
        return;
      }

      setIsCheckingAuth(false);
    };

    checkAuth();
  }, [sessionStatus, session, localUser, localUserLoading, requireAuth, router, lang]);

  const handleSetup = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/2fa/setup/');
      setQrCode(response.data.qr_code);
      setSecret(response.data.secret);
      setStep('verify');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to setup 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/2fa/verify/', {
        code: verifyCode,
      });
      setBackupCodes(response.data.backup_codes);
      setStep('backup');
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.code?.[0] || 'Invalid code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleFinish = () => {
    router.push(`/${lang}`);
  };

  if (isCheckingAuth || sessionStatus === 'loading' || localUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
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
          {step === 'setup' && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">Enable Two-Factor Authentication</h1>
                <p className="text-surface-400 mt-2">
                  Add an extra layer of security to your account
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3 p-3 bg-surface-800/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-400 font-bold text-sm">1</span>
                  </div>
                  <p className="text-surface-300 text-sm">
                    Download an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-surface-800/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-400 font-bold text-sm">2</span>
                  </div>
                  <p className="text-surface-300 text-sm">
                    Scan the QR code or enter the secret key manually
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-surface-800/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-400 font-bold text-sm">3</span>
                  </div>
                  <p className="text-surface-300 text-sm">
                    Enter the 6-digit code from your app to verify
                  </p>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleSetup}
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  'Start Setup'
                )}
              </button>
            </>
          )}

          {step === 'verify' && (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-white">Scan QR Code</h1>
                <p className="text-surface-400 mt-2">
                  Scan this code with your authenticator app
                </p>
              </div>

              {/* QR Code */}
              <div className="bg-white p-4 rounded-xl mb-6 flex justify-center">
                {qrCode && (
                  <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                )}
              </div>

              {/* Manual entry */}
              <div className="mb-6">
                <p className="text-surface-400 text-sm text-center mb-2">
                  Or enter this code manually:
                </p>
                <div className="bg-surface-800 px-4 py-2 rounded-lg text-center font-mono text-sm text-white break-all">
                  {secret}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-center text-2xl tracking-widest focus:border-primary-500 focus:outline-none"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || verifyCode.length !== 6}
                  className="w-full py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Enable'
                  )}
                </button>
              </form>
            </>
          )}

          {step === 'backup' && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <h1 className="text-2xl font-bold text-white">2FA Enabled!</h1>
                <p className="text-surface-400 mt-2">
                  Save these backup codes in a safe place
                </p>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-2 text-yellow-400 text-sm">
                  <KeyRound className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Important!</p>
                    <p className="text-yellow-400/80">
                      If you lose access to your authenticator app, you can use these backup codes to sign in.
                      Each code can only be used once.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-surface-800 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, i) => (
                    <div
                      key={i}
                      className="font-mono text-sm text-white bg-surface-700 px-3 py-2 rounded text-center"
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCopyBackupCodes}
                className="w-full py-3 mb-4 bg-surface-700 hover:bg-surface-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {copiedCodes ? (
                  <>
                    <Check className="w-5 h-5 text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copy Codes
                  </>
                )}
              </button>

              <button
                onClick={handleFinish}
                className="w-full py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
