'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  MoreVertical,
  UserPlus,
  Shield,
  ShieldOff,
  Trash2,
  Edit,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  Key,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { api } from '@/lib/api';

interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_admin: boolean;
  subscription_tier: string;
  has_2fa: boolean;
  created_at: string;
  last_login: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
}

export default function AdminUsersPage() {
  const params = useParams();
  const router = useRouter();
  const lang = params.lang as string || 'en';

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (tierFilter) params.append('tier', tierFilter);
      params.append('page', page.toString());
      
      const response = await api.get(`/api/admin/users/?${params.toString()}`);
      setUsers(response.data.results || response.data);
      setTotalPages(response.data.total_pages || 1);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 403) {
        setError('Access denied. You do not have admin privileges.');
      } else if (status === 401) {
        setError('Authentication required. Please log in again.');
      } else {
        setError(err.response?.data?.detail || 'Failed to load users');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, tierFilter, page]);

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  };

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(''), 5000);
  };

  const handleChangeTier = async (userId: number, tier: string) => {
    setActionLoading(userId);
    setError('');
    try {
      await api.post(`/api/admin/users/${userId}/change_tier/`, { tier });
      showSuccess(`User tier changed to ${tier}`);
      fetchUsers();
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Failed to change tier');
    } finally {
      setActionLoading(null);
      setActiveMenu(null);
    }
  };

  const handleToggleAdmin = async (userId: number) => {
    setActionLoading(userId);
    setError('');
    try {
      await api.post(`/api/admin/users/${userId}/toggle_admin/`);
      const user = users.find(u => u.id === userId);
      showSuccess(`Admin status ${user?.is_admin ? 'removed' : 'granted'}`);
      fetchUsers();
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Failed to toggle admin status');
    } finally {
      setActionLoading(null);
      setActiveMenu(null);
    }
  };

  const handleUnlock = async (userId: number) => {
    setActionLoading(userId);
    setError('');
    try {
      await api.post(`/api/admin/users/${userId}/unlock/`);
      showSuccess('User account unlocked');
      fetchUsers();
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Failed to unlock user');
    } finally {
      setActionLoading(null);
      setActiveMenu(null);
    }
  };

  const handleDisable2FA = async (userId: number) => {
    if (!confirm('Are you sure you want to disable 2FA for this user?')) return;
    
    setActionLoading(userId);
    setError('');
    try {
      await api.post(`/api/admin/users/${userId}/disable_2fa/`);
      showSuccess('2FA disabled for user');
      fetchUsers();
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Failed to disable 2FA');
    } finally {
      setActionLoading(null);
      setActiveMenu(null);
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    setActionLoading(userId);
    setError('');
    try {
      await api.delete(`/api/admin/users/${userId}/`);
      showSuccess('User deleted successfully');
      fetchUsers();
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Failed to delete user');
    } finally {
      setActionLoading(null);
      setActiveMenu(null);
    }
  };

  const handleResetPassword = async (userId: number) => {
    const newPassword = prompt('Enter new password for user (min 8 characters):');
    if (!newPassword) return;
    
    if (newPassword.length < 8) {
      showError('Password must be at least 8 characters');
      return;
    }
    
    setActionLoading(userId);
    setError('');
    try {
      await api.post(`/api/admin/users/${userId}/reset_password/`, { new_password: newPassword });
      showSuccess('Password reset successfully');
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setActionLoading(null);
      setActiveMenu(null);
    }
  };

  const isLocked = (user: User) => {
    if (!user.locked_until) return false;
    return new Date(user.locked_until) > new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-surface-400 mt-1">Manage user accounts and permissions</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, username, or name..."
            className="w-full pl-10 pr-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white placeholder-surface-500 focus:border-primary-500 focus:outline-none"
          />
        </div>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="px-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
        >
          <option value="">All Tiers</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl overflow-hidden"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-800/50">
                    <th className="text-left px-4 py-3 text-surface-400 text-sm font-medium">User</th>
                    <th className="text-left px-4 py-3 text-surface-400 text-sm font-medium">Tier</th>
                    <th className="text-left px-4 py-3 text-surface-400 text-sm font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-surface-400 text-sm font-medium">2FA</th>
                    <th className="text-left px-4 py-3 text-surface-400 text-sm font-medium">Created</th>
                    <th className="text-right px-4 py-3 text-surface-400 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-surface-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold">
                            {user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-medium flex items-center gap-2">
                              {user.username}
                              {user.is_admin && (
                                <Shield className="w-4 h-4 text-primary-400" />
                              )}
                            </p>
                            <p className="text-surface-400 text-sm">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.subscription_tier === 'enterprise' ? 'bg-accent-500/20 text-accent-400' :
                          user.subscription_tier === 'pro' ? 'bg-primary-500/20 text-primary-400' :
                          'bg-surface-600/20 text-surface-400'
                        }`}>
                          {user.subscription_tier}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isLocked(user) ? (
                          <span className="flex items-center gap-1 text-red-400 text-sm">
                            <Lock className="w-4 h-4" />
                            Locked
                          </span>
                        ) : user.is_active ? (
                          <span className="text-green-400 text-sm">Active</span>
                        ) : (
                          <span className="text-surface-400 text-sm">Inactive</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.has_2fa ? (
                          <span className="flex items-center gap-1 text-green-400 text-sm">
                            <Key className="w-4 h-4" />
                            Enabled
                          </span>
                        ) : (
                          <span className="text-surface-500 text-sm">Disabled</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-surface-400 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="relative">
                          <button
                            onClick={() => setActiveMenu(activeMenu === user.id ? null : user.id)}
                            disabled={actionLoading === user.id}
                            className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
                          >
                            {actionLoading === user.id ? (
                              <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                            ) : (
                              <MoreVertical className="w-5 h-5 text-surface-400" />
                            )}
                          </button>
                          
                          {activeMenu === user.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setActiveMenu(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 w-56 bg-surface-800 border border-surface-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                                <div className="py-1">
                                  {/* Edit Profile */}
                                  <button
                                    onClick={() => {
                                      router.push(`/${lang}/admin/users/${user.id}`);
                                      setActiveMenu(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-surface-700 transition-colors"
                                  >
                                    <Edit className="w-4 h-4 text-surface-400" />
                                    <span className="text-surface-300">Edit Profile</span>
                                  </button>
                                  
                                  {/* Reset Password */}
                                  <button
                                    onClick={() => handleResetPassword(user.id)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-surface-700 transition-colors"
                                  >
                                    <Lock className="w-4 h-4 text-surface-400" />
                                    <span className="text-surface-300">Reset Password</span>
                                  </button>
                                  
                                  <div className="border-t border-surface-700 my-1" />
                                  
                                  {/* Admin Toggle */}
                                  <button
                                    onClick={() => handleToggleAdmin(user.id)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-surface-700 transition-colors"
                                  >
                                    {user.is_admin ? (
                                      <>
                                        <ShieldOff className="w-4 h-4 text-surface-400" />
                                        <span className="text-surface-300">Remove Admin</span>
                                      </>
                                    ) : (
                                      <>
                                        <Shield className="w-4 h-4 text-primary-400" />
                                        <span className="text-surface-300">Make Admin</span>
                                      </>
                                    )}
                                  </button>
                                  
                                  <div className="border-t border-surface-700 my-1" />
                                  
                                  {/* Tier Options */}
                                  <button
                                    onClick={() => handleChangeTier(user.id, 'free')}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-surface-700 transition-colors"
                                  >
                                    <span className="w-4 h-4 rounded-full bg-surface-500" />
                                    <span className="text-surface-300">Set Free</span>
                                  </button>
                                  <button
                                    onClick={() => handleChangeTier(user.id, 'pro')}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-surface-700 transition-colors"
                                  >
                                    <span className="w-4 h-4 rounded-full bg-primary-500" />
                                    <span className="text-surface-300">Set Pro</span>
                                  </button>
                                  <button
                                    onClick={() => handleChangeTier(user.id, 'enterprise')}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-surface-700 transition-colors"
                                  >
                                    <span className="w-4 h-4 rounded-full bg-accent-500" />
                                    <span className="text-surface-300">Set Enterprise</span>
                                  </button>
                                  
                                  {isLocked(user) && (
                                    <>
                                      <div className="border-t border-surface-700 my-1" />
                                      <button
                                        onClick={() => handleUnlock(user.id)}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-surface-700 transition-colors"
                                      >
                                        <Unlock className="w-4 h-4 text-green-400" />
                                        <span className="text-surface-300">Unlock Account</span>
                                      </button>
                                    </>
                                  )}
                                  
                                  {user.has_2fa && (
                                    <>
                                      <div className="border-t border-surface-700 my-1" />
                                      <button
                                        onClick={() => handleDisable2FA(user.id)}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-surface-700 transition-colors"
                                      >
                                        <Key className="w-4 h-4 text-yellow-400" />
                                        <span className="text-surface-300">Disable 2FA</span>
                                      </button>
                                    </>
                                  )}
                                  
                                  <div className="border-t border-surface-700 my-1" />
                                  
                                  <button
                                    onClick={() => handleDelete(user.id)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-surface-700 transition-colors text-red-400"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Delete User</span>
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-800">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1 text-surface-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="text-surface-400 text-sm">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-1 text-surface-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
