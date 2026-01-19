'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  User,
  Mail,
  Shield,
  Calendar,
  HardDrive,
} from 'lucide-react';
import { api } from '@/lib/api';
import Link from 'next/link';

interface UserData {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_admin: boolean;
  subscription_tier: string;
  subscription_expires_at: string | null;
  storage_used: number;
  storage_limit: number;
  max_concurrent_jobs: number;
  monthly_conversion_limit: number;
  conversions_this_month: number;
  created_at: string;
  last_login: string | null;
  auth_provider: string;
  totp_enabled: boolean;
  preferred_language: string;
  default_container: string;
  default_hw_backend: string;
  default_quality_preset: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function AdminUserEditPage() {
  const params = useParams();
  const router = useRouter();
  const lang = params.lang as string || 'en';
  const userId = params.id as string;

  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await api.get(`/api/admin/users/${userId}/`);
        setUser(response.data);
      } catch (err: any) {
        const status = err.response?.status;
        if (status === 404) {
          setError('User not found.');
        } else if (status === 403) {
          setError('Access denied.');
        } else {
          setError(err.response?.data?.detail || 'Failed to load user');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.patch(`/api/admin/users/${userId}/`, {
        first_name: user.first_name,
        last_name: user.last_name,
        is_active: user.is_active,
        preferred_language: user.preferred_language,
        default_container: user.default_container,
        default_hw_backend: user.default_hw_backend,
        default_quality_preset: user.default_quality_preset,
        storage_limit: user.storage_limit,
        max_concurrent_jobs: user.max_concurrent_jobs,
        monthly_conversion_limit: user.monthly_conversion_limit,
      });
      setUser(response.data);
      setSuccess('User updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof UserData, value: any) => {
    if (!user) return;
    setUser({ ...user, [field]: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="glass rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-400">{error || 'User not found'}</p>
        <Link
          href={`/${lang}/admin/users`}
          className="inline-flex items-center gap-2 mt-4 text-primary-400 hover:text-primary-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/${lang}/admin/users`}
            className="p-2 hover:bg-surface-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-surface-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Edit User</h1>
            <p className="text-surface-400 mt-1">
              {user.username} ({user.email})
            </p>
          </div>
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
        {/* Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary-500/10">
              <User className="w-5 h-5 text-primary-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Basic Information</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-surface-400 mb-1">First Name</label>
                <input
                  type="text"
                  value={user.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-surface-400 mb-1">Last Name</label>
                <input
                  type="text"
                  value={user.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-surface-400 mb-1">Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-3 py-2 bg-surface-800/50 border border-surface-700 rounded-lg text-surface-400 text-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm text-surface-400 mb-1">Username</label>
              <input
                type="text"
                value={user.username}
                disabled
                className="w-full px-3 py-2 bg-surface-800/50 border border-surface-700 rounded-lg text-surface-400 text-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm text-surface-400 mb-1">Preferred Language</label>
              <select
                value={user.preferred_language}
                onChange={(e) => handleChange('preferred_language', e.target.value)}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="es">Español</option>
                <option value="it">Italiano</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 bg-surface-800/50 rounded-lg">
              <div>
                <p className="text-white font-medium text-sm">Active Account</p>
                <p className="text-surface-500 text-xs">Enable or disable user account</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={user.is_active}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>
          </div>
        </motion.div>

        {/* Account Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Account Status</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-surface-800/50 rounded-lg">
                <p className="text-surface-400 text-xs mb-1">Auth Provider</p>
                <p className="text-white font-medium capitalize">{user.auth_provider}</p>
              </div>
              <div className="p-3 bg-surface-800/50 rounded-lg">
                <p className="text-surface-400 text-xs mb-1">Subscription Tier</p>
                <p className="text-white font-medium capitalize">{user.subscription_tier}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-surface-800/50 rounded-lg">
                <p className="text-surface-400 text-xs mb-1">Admin Status</p>
                <p className={`font-medium ${user.is_admin ? 'text-primary-400' : 'text-surface-400'}`}>
                  {user.is_admin ? 'Administrator' : 'User'}
                </p>
              </div>
              <div className="p-3 bg-surface-800/50 rounded-lg">
                <p className="text-surface-400 text-xs mb-1">2FA Status</p>
                <p className={`font-medium ${user.totp_enabled ? 'text-green-400' : 'text-surface-400'}`}>
                  {user.totp_enabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-surface-800/50 rounded-lg">
                <p className="text-surface-400 text-xs mb-1">Created</p>
                <p className="text-white text-sm">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="p-3 bg-surface-800/50 rounded-lg">
                <p className="text-surface-400 text-xs mb-1">Last Login</p>
                <p className="text-white text-sm">
                  {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Limits & Quotas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-green-500/10">
              <HardDrive className="w-5 h-5 text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Limits & Quotas</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-surface-400 mb-1">Storage Limit (GB)</label>
              <input
                type="number"
                value={(user.storage_limit / (1024 * 1024 * 1024)).toFixed(1)}
                onChange={(e) => handleChange('storage_limit', parseFloat(e.target.value) * 1024 * 1024 * 1024)}
                min="1"
                max="1000"
                step="1"
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
              />
              <p className="text-surface-500 text-xs mt-1">
                Current usage: {formatBytes(user.storage_used)}
              </p>
            </div>

            <div>
              <label className="block text-sm text-surface-400 mb-1">Max Concurrent Jobs</label>
              <input
                type="number"
                value={user.max_concurrent_jobs}
                onChange={(e) => handleChange('max_concurrent_jobs', parseInt(e.target.value) || 1)}
                min="1"
                max="10"
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-surface-400 mb-1">Monthly Conversion Limit</label>
              <input
                type="number"
                value={user.monthly_conversion_limit}
                onChange={(e) => handleChange('monthly_conversion_limit', parseInt(e.target.value) || 10)}
                min="1"
                max="10000"
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
              />
              <p className="text-surface-500 text-xs mt-1">
                This month: {user.conversions_this_month} / {user.monthly_conversion_limit}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Conversion Defaults */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Conversion Defaults</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-surface-400 mb-1">Default Container</label>
              <select
                value={user.default_container}
                onChange={(e) => handleChange('default_container', e.target.value)}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="mkv">MKV</option>
                <option value="mp4">MP4</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-surface-400 mb-1">Default HW Backend</label>
              <select
                value={user.default_hw_backend}
                onChange={(e) => handleChange('default_hw_backend', e.target.value)}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="auto">Auto</option>
                <option value="vaapi">VAAPI</option>
                <option value="qsv">QSV</option>
                <option value="cpu">CPU</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-surface-400 mb-1">Default Quality Preset</label>
              <select
                value={user.default_quality_preset}
                onChange={(e) => handleChange('default_quality_preset', e.target.value)}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="fast">Fast</option>
                <option value="balanced">Balanced</option>
                <option value="quality">High Quality</option>
              </select>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
