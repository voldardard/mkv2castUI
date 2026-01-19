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

/**
 * Download a converted file with authentication
 * Uses blob response and triggers browser download
 */
export async function downloadFile(lang: string, jobId: string, filename: string): Promise<void> {
  try {
    // Get auth token
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      throw new Error('Authentication required');
    }

    // Create a temporary form to trigger download with proper headers
    // This bypasses axios interceptors and allows browser to handle download natively
    const form = document.createElement('form');
    form.method = 'GET';
    form.action = `/${lang}/api/jobs/${jobId}/download/`;
    form.style.display = 'none';
    
    // Add CSRF token if available
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      const csrfInput = document.createElement('input');
      csrfInput.type = 'hidden';
      csrfInput.name = 'csrfmiddlewaretoken';
      csrfInput.value = csrfToken;
      form.appendChild(csrfInput);
    }
    
    document.body.appendChild(form);
    
    // Encode filename for URL (use encodeURIComponent for safe encoding)
    const encodedFilename = encodeURIComponent(filename);
    
    // Use fetch with proper headers to get the file
    // Include filename in URL for better browser compatibility
    const response = await fetch(`/${lang}/api/jobs/${jobId}/download/${encodedFilename}`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${token}`,
        ...(csrfToken && { 'X-CSRFToken': csrfToken }),
      },
    });
    
    // Check if response is OK
    if (!response.ok) {
      // Try to parse error
      const errorText = await response.text();
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.detail || 'Download failed');
      } catch {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }
    }
    
    // Check Content-Type
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const error = await response.json();
      throw new Error(error.detail || 'Download failed');
    }
    
    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get('content-disposition');
    let downloadFilename = filename;
    
    if (contentDisposition) {
      // Try to extract filename from Content-Disposition
      // Support both filename="..." and filename*=UTF-8''...
      const filenameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/) ||
                           contentDisposition.match(/filename="?([^";]+)"?/);
      
      if (filenameMatch && filenameMatch[1]) {
        try {
          downloadFilename = decodeURIComponent(filenameMatch[1]);
        } catch {
          downloadFilename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
    }
    
    // Get blob and trigger download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadFilename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      document.body.removeChild(form);
      window.URL.revokeObjectURL(url);
    }, 100);
  } catch (error: any) {
    console.error('Download error:', error);
    throw error;
  }
}

/**
 * Get active jobs (pending, queued, analyzing, processing)
 */
export async function getActiveJobs(lang: string): Promise<string[]> {
  const response = await api.get(`/${lang}/api/jobs/`);
  const jobs = response.data.results || response.data || [];
  return jobs
    .filter((job: any) => ['pending', 'queued', 'analyzing', 'processing'].includes(job.status))
    .map((job: any) => job.id);
}
