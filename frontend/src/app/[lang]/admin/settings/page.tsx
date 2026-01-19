'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Settings,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Shield,
  HardDrive,
  Cpu,
  Users,
  Mail,
  Key,
  Send,
  Eye,
  EyeOff,
  Cloud,
} from 'lucide-react';
import { api } from '@/lib/api';

interface SiteSettings {
  // Defaults
  site_name: string;
  site_tagline: string;
  default_container: string;
  default_hw_backend: string;
  default_quality_preset: string;
  max_file_size: number;
  // Server
  maintenance_mode: boolean;
  maintenance_message: string;
  allow_registration: boolean;
  require_email_verification: boolean;
  // Auth
  require_auth: boolean;
  google_client_id: string;
  google_client_secret: string;
  google_configured: boolean;
  github_client_id: string;
  github_client_secret: string;
  github_configured: boolean;
  // SMTP
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_password_set: boolean;
  smtp_use_tls: boolean;
  smtp_use_ssl: boolean;
  smtp_from_email: string;
  smtp_from_name: string;
  // S3 Storage
  use_s3_storage: boolean;
  s3_endpoint: string;
  s3_access_key: string;
  s3_secret_key: string;
  s3_bucket_name: string;
  s3_region: string;
  s3_custom_domain: string;
  s3_configured: boolean;
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

function parseBytes(gb: string): number {
  return parseFloat(gb) * 1024 * 1024 * 1024;
}

export default function AdminSettingsPage() {
  const params = useParams();
  const lang = params.lang as string || 'en';

  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSecrets, setShowSecrets] = useState({
    google: false,
    github: false,
    smtp: false,
    s3: false,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await api.get('/api/admin/settings/');
        setSettings(response.data);
      } catch (err: any) {
        const status = err.response?.status;
        if (status === 403) {
          setError('Access denied. You do not have admin privileges.');
        } else if (status === 401) {
          setError('Authentication required. Please log in again.');
        } else {
          setError(err.response?.data?.detail || 'Failed to load settings');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.put('/api/admin/settings/', settings);
      setSettings(response.data);
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 403) {
        setError('Access denied. You do not have admin privileges.');
      } else if (status === 401) {
        setError('Authentication required. Please log in again.');
      } else {
        setError(err.response?.data?.detail || 'Failed to save settings');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSMTP = async () => {
    setIsTesting(true);
    setError('');
    try {
      await api.post('/api/admin/settings/test-smtp/');
      setSuccess('Test email sent successfully! Check your inbox.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send test email. Check SMTP configuration.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleChange = (field: keyof SiteSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="glass rounded-xl p-6 text-center">
        <p className="text-red-400">{error || 'Failed to load settings'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Server Settings</h1>
          <p className="text-surface-400 mt-1">Configure server options, authentication, and email settings</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Defaults */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary-500/10">
              <Cpu className="w-5 h-5 text-primary-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Conversion Defaults</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Default Container Format
              </label>
              <select
                value={settings.default_container}
                onChange={(e) => handleChange('default_container', e.target.value)}
                className="w-full px-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
              >
                <option value="mkv">MKV (Matroska)</option>
                <option value="mp4">MP4 (MPEG-4)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Default Hardware Backend
              </label>
              <select
                value={settings.default_hw_backend}
                onChange={(e) => handleChange('default_hw_backend', e.target.value)}
                className="w-full px-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
              >
                <option value="auto">Auto-detect</option>
                <option value="vaapi">VAAPI (AMD/Intel)</option>
                <option value="qsv">QSV (Intel Quick Sync)</option>
                <option value="cpu">CPU (Software)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Default Quality Preset
              </label>
              <select
                value={settings.default_quality_preset}
                onChange={(e) => handleChange('default_quality_preset', e.target.value)}
                className="w-full px-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
              >
                <option value="fast">Fast (Lower Quality)</option>
                <option value="balanced">Balanced</option>
                <option value="quality">High Quality (Slower)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Maximum File Size (GB)
              </label>
              <input
                type="number"
                value={(settings.max_file_size / (1024 * 1024 * 1024)).toFixed(1)}
                onChange={(e) => handleChange('max_file_size', parseBytes(e.target.value))}
                min="1"
                max="100"
                step="0.5"
                className="w-full px-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
              />
              <p className="text-surface-500 text-xs mt-1">
                Maximum upload size: {formatBytes(settings.max_file_size)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Registration & Security */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Registration & Security</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface-800/50 rounded-lg">
              <div>
                <p className="text-white font-medium">Require Authentication</p>
                <p className="text-surface-400 text-sm">Disable for local-only access</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.require_auth}
                  onChange={(e) => handleChange('require_auth', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-surface-800/50 rounded-lg">
              <div>
                <p className="text-white font-medium">Allow Registration</p>
                <p className="text-surface-400 text-sm">Enable new user sign-ups</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allow_registration}
                  onChange={(e) => handleChange('allow_registration', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-surface-800/50 rounded-lg">
              <div>
                <p className="text-white font-medium">Require Email Verification</p>
                <p className="text-surface-400 text-sm">Users must verify email to use service</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.require_email_verification}
                  onChange={(e) => handleChange('require_email_verification', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>
          </div>
        </motion.div>

        {/* OAuth Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Key className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">OAuth Providers</h2>
          </div>

          <div className="space-y-6">
            {/* Google */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">Google OAuth</h3>
                {settings.google_configured && (
                  <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                    Configured
                  </span>
                )}
              </div>
              <div>
                <label className="block text-sm text-surface-400 mb-1">Client ID</label>
                <input
                  type="text"
                  value={settings.google_client_id}
                  onChange={(e) => handleChange('google_client_id', e.target.value)}
                  placeholder="xxxx.apps.googleusercontent.com"
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-surface-400 mb-1">Client Secret</label>
                <div className="relative">
                  <input
                    type={showSecrets.google ? 'text' : 'password'}
                    value={settings.google_client_secret}
                    onChange={(e) => handleChange('google_client_secret', e.target.value)}
                    placeholder={settings.google_configured ? '••••••••••••••••' : 'Enter secret'}
                    className="w-full px-3 py-2 pr-10 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecrets(s => ({ ...s, google: !s.google }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-500 hover:text-white"
                  >
                    {showSecrets.google ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* GitHub */}
            <div className="space-y-3 pt-4 border-t border-surface-700">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">GitHub OAuth</h3>
                {settings.github_configured && (
                  <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                    Configured
                  </span>
                )}
              </div>
              <div>
                <label className="block text-sm text-surface-400 mb-1">Client ID</label>
                <input
                  type="text"
                  value={settings.github_client_id}
                  onChange={(e) => handleChange('github_client_id', e.target.value)}
                  placeholder="Iv1.xxxxxxxxxxxx"
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-surface-400 mb-1">Client Secret</label>
                <div className="relative">
                  <input
                    type={showSecrets.github ? 'text' : 'password'}
                    value={settings.github_client_secret}
                    onChange={(e) => handleChange('github_client_secret', e.target.value)}
                    placeholder={settings.github_configured ? '••••••••••••••••' : 'Enter secret'}
                    className="w-full px-3 py-2 pr-10 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecrets(s => ({ ...s, github: !s.github }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-500 hover:text-white"
                  >
                    {showSecrets.github ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* SMTP Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Mail className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Email (SMTP)</h2>
            {settings.smtp_password_set && (
              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                Configured
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-surface-400 mb-1">SMTP Host</label>
                <input
                  type="text"
                  value={settings.smtp_host}
                  onChange={(e) => handleChange('smtp_host', e.target.value)}
                  placeholder="smtp.example.com"
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-surface-400 mb-1">Port</label>
                <input
                  type="number"
                  value={settings.smtp_port}
                  onChange={(e) => handleChange('smtp_port', parseInt(e.target.value) || 587)}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-surface-400 mb-1">Username</label>
              <input
                type="text"
                value={settings.smtp_username}
                onChange={(e) => handleChange('smtp_username', e.target.value)}
                placeholder="your-email@example.com"
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-surface-400 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showSecrets.smtp ? 'text' : 'password'}
                  value={settings.smtp_password}
                  onChange={(e) => handleChange('smtp_password', e.target.value)}
                  placeholder={settings.smtp_password_set ? '••••••••••••••••' : 'Enter password'}
                  className="w-full px-3 py-2 pr-10 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets(s => ({ ...s, smtp: !s.smtp }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-500 hover:text-white"
                >
                  {showSecrets.smtp ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-surface-400 mb-1">From Email</label>
                <input
                  type="email"
                  value={settings.smtp_from_email}
                  onChange={(e) => handleChange('smtp_from_email', e.target.value)}
                  placeholder="noreply@example.com"
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-surface-400 mb-1">From Name</label>
                <input
                  type="text"
                  value={settings.smtp_from_name}
                  onChange={(e) => handleChange('smtp_from_name', e.target.value)}
                  placeholder="mkv2cast"
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.smtp_use_tls}
                  onChange={(e) => handleChange('smtp_use_tls', e.target.checked)}
                  className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-primary-500"
                />
                <span className="text-sm text-surface-300">Use TLS</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.smtp_use_ssl}
                  onChange={(e) => handleChange('smtp_use_ssl', e.target.checked)}
                  className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-primary-500"
                />
                <span className="text-sm text-surface-300">Use SSL</span>
              </label>
            </div>

            <button
              onClick={handleTestSMTP}
              disabled={isTesting || !settings.smtp_host}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Test Email
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* S3 Storage Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-xl p-6 lg:col-span-2"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <Cloud className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">S3 Storage</h2>
            {settings.s3_configured && (
              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                Configured
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface-800/50 rounded-lg">
              <div>
                <p className="text-white font-medium">Enable S3 Storage</p>
                <p className="text-surface-400 text-sm">
                  Store files on S3-compatible storage (AWS S3, MinIO, Backblaze B2, etc.)
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.use_s3_storage}
                  onChange={(e) => handleChange('use_s3_storage', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>

            {settings.use_s3_storage && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-surface-700">
                <div>
                  <label className="block text-sm text-surface-400 mb-1">Endpoint URL</label>
                  <input
                    type="url"
                    value={settings.s3_endpoint}
                    onChange={(e) => handleChange('s3_endpoint', e.target.value)}
                    placeholder="https://s3.amazonaws.com"
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
                  />
                  <p className="text-surface-500 text-xs mt-1">Leave empty for AWS S3</p>
                </div>

                <div>
                  <label className="block text-sm text-surface-400 mb-1">Region</label>
                  <input
                    type="text"
                    value={settings.s3_region}
                    onChange={(e) => handleChange('s3_region', e.target.value)}
                    placeholder="us-east-1"
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-surface-400 mb-1">Bucket Name</label>
                  <input
                    type="text"
                    value={settings.s3_bucket_name}
                    onChange={(e) => handleChange('s3_bucket_name', e.target.value)}
                    placeholder="my-mkv2cast-bucket"
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-surface-400 mb-1">Custom Domain (CDN)</label>
                  <input
                    type="url"
                    value={settings.s3_custom_domain}
                    onChange={(e) => handleChange('s3_custom_domain', e.target.value)}
                    placeholder="https://cdn.example.com"
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
                  />
                  <p className="text-surface-500 text-xs mt-1">Optional: Custom domain for serving files</p>
                </div>

                <div>
                  <label className="block text-sm text-surface-400 mb-1">Access Key ID</label>
                  <input
                    type="text"
                    value={settings.s3_access_key}
                    onChange={(e) => handleChange('s3_access_key', e.target.value)}
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-surface-400 mb-1">Secret Access Key</label>
                  <div className="relative">
                    <input
                      type={showSecrets.s3 ? 'text' : 'password'}
                      value={settings.s3_secret_key}
                      onChange={(e) => handleChange('s3_secret_key', e.target.value)}
                      placeholder={settings.s3_configured ? '••••••••••••••••' : 'Enter secret key'}
                      className="w-full px-3 py-2 pr-10 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets(s => ({ ...s, s3: !s.s3 }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-500 hover:text-white"
                    >
                      {showSecrets.s3 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {settings.use_s3_storage && (
              <div className="p-3 bg-surface-800/50 rounded-lg mt-4">
                <p className="text-surface-400 text-sm">
                  <strong className="text-white">Note:</strong> After enabling S3, new files will be stored in S3. 
                  Existing files will remain on local storage. Use the migration tool to move existing files to S3.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Maintenance Mode */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-xl p-6 lg:col-span-2"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Shield className="w-5 h-5 text-yellow-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Maintenance Mode</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface-800/50 rounded-lg">
              <div>
                <p className="text-white font-medium">Enable Maintenance Mode</p>
                <p className="text-surface-400 text-sm">
                  Temporarily disable the service for maintenance
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.maintenance_mode}
                  onChange={(e) => handleChange('maintenance_mode', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
              </label>
            </div>

            {settings.maintenance_mode && (
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Maintenance Message
                </label>
                <textarea
                  value={settings.maintenance_message}
                  onChange={(e) => handleChange('maintenance_message', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white focus:border-primary-500 focus:outline-none resize-none"
                  placeholder="Message shown to users during maintenance..."
                />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
