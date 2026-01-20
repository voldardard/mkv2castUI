'use client';

import { useQuery } from '@tanstack/react-query';
import { api, getCurrentLang } from '@/lib/api';

export interface AuthConfig {
  require_auth: boolean;
  providers: string[];
  allow_registration: boolean;
  site_name: string;
  user?: {
    id: number;
    email: string;
    username: string;
    subscription_tier: string;
    is_admin: boolean;
    has_2fa: boolean;
  };
}

/**
 * Check if authentication is required based on environment variable.
 * This is available immediately without any API call.
 */
export function isAuthRequired(): boolean {
  if (typeof window === 'undefined') return true; // SSR default
  const envValue = process.env.NEXT_PUBLIC_REQUIRE_AUTH;
  if (envValue === undefined || envValue === '') return true;
  return envValue.toLowerCase() !== 'false' && envValue !== '0';
}

/**
 * Hook to get authentication configuration from the backend.
 * This is optional - the app works without it using client-side env vars.
 */
export function useAuthConfig() {
  return useQuery<AuthConfig>({
    queryKey: ['auth-config'],
    queryFn: async () => {
      const lang = getCurrentLang();
      const response = await api.get<AuthConfig>(`/${lang}/api/auth/config/`);
      return response.data;
    },
    staleTime: Infinity,
    retry: false, // Don't retry - use fallback instead
    // Don't throw on error - we have a fallback
    throwOnError: false,
  });
}

/**
 * Hook that returns whether auth is required.
 * Uses client-side env var immediately, doesn't block on API.
 * 
 * This hook NEVER blocks - it returns immediately with the client-side value,
 * then updates if the server returns a different value.
 */
export function useRequireAuth() {
  const { data: config, isError } = useAuthConfig();
  
  // Client-side check (immediate, no API call needed)
  const clientRequireAuth = isAuthRequired();
  
  // If we have server config and it's different, use it
  // Otherwise, use client-side value
  const requireAuth = config?.require_auth ?? clientRequireAuth;
  
  return {
    requireAuth,
    // Never block - we always have a fallback value
    isLoading: false,
    config,
    isError,
  };
}

/**
 * Hook to get current user from local token or API.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return null;
      
      try {
        const lang = getCurrentLang();
        const response = await api.get(`/${lang}/api/auth/me/`, {
          headers: { Authorization: `Token ${token}` }
        });
        return response.data;
      } catch {
        // Token invalid, remove it
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}
