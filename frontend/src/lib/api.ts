import axios from 'axios';

// Create axios instance with default config
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage for Token authentication
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers['Authorization'] = `Token ${token}`;
    }
    
    // Get CSRF token from cookie
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Clear invalid token
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        // Redirect to login on unauthorized/forbidden
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/auth/login')) {
          window.location.href = '/en/auth/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Helper function to get cookie value
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

// API helper functions
export async function uploadFile(
  lang: string,
  file: File,
  options: Record<string, any>,
  onProgress?: (progress: number) => void
) {
  const formData = new FormData();
  formData.append('file', file);
  
  Object.entries(options).forEach(([key, value]) => {
    formData.append(key, String(value));
  });

  const response = await api.post(`/${lang}/api/upload/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
        onProgress(progress);
      }
    },
  });

  return response.data;
}

export async function getJobs(lang: string) {
  const response = await api.get(`/${lang}/api/jobs/`);
  return response.data;
}

export async function getJob(lang: string, jobId: string) {
  const response = await api.get(`/${lang}/api/jobs/${jobId}/`);
  return response.data;
}

export async function cancelJob(lang: string, jobId: string) {
  const response = await api.post(`/${lang}/api/jobs/${jobId}/cancel/`);
  return response.data;
}

export async function deleteJob(lang: string, jobId: string) {
  const response = await api.delete(`/${lang}/api/jobs/${jobId}/`);
  return response.data;
}

export async function getOptions(lang: string) {
  const response = await api.get(`/${lang}/api/options/`);
  return response.data;
}

export async function getUserStats(lang: string) {
  const response = await api.get(`/${lang}/api/stats/`);
  return response.data;
}
