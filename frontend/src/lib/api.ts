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
/**
 * Request presigned upload URL for direct file upload to S3/MinIO
 */
export async function requestUploadUrl(lang: string, filename: string, size: number) {
  const response = await api.post(`/${lang}/api/upload/presigned/`, {
    filename,
    size,
  });
  return response.data; // { file_id, upload_url, key, expires_in }
}

/**
 * Upload file directly to S3/MinIO using presigned URL
 */
export async function uploadFileDirectly(
  uploadUrl: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = Math.round((e.loaded / e.total) * 100);
        onProgress(progress);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });
    
    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });
    
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', 'video/x-matroska');
    xhr.send(file);
  });
}

/**
 * Confirm upload completion and trigger file analysis
 */
export async function confirmUploadComplete(lang: string, fileId: string) {
  const response = await api.post(`/${lang}/api/upload/${fileId}/complete/`);
  return response.data; // { status, file_id }
}

/**
 * Get file metadata (with polling if analyzing)
 */
export async function getFileMetadata(lang: string, fileId: string): Promise<{
  status: string;
  metadata?: any;
  message?: string;
}> {
  const response = await api.get(`/${lang}/api/upload/${fileId}/metadata/`);
  return response.data;
}

/**
 * Create conversion job from pending file
 */
export async function createJobFromFile(
  lang: string,
  fileId: string,
  options: Record<string, any>
) {
  const response = await api.post(`/${lang}/api/jobs/create-from-file/`, {
    file_id: fileId,
    options,
  });
  return response.data;
}

/**
 * Legacy upload function (fallback)
 */
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
 * Uses presigned URL from backend and triggers browser download
 */
export async function downloadFile(lang: string, jobId: string, filename: string): Promise<void> {
  try {
    // Get auth token
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      throw new Error('Authentication required');
    }

    // Encode filename for URL
    const encodedFilename = encodeURIComponent(filename);
    
    // Request download URL from backend
    const response = await api.get(`/${lang}/api/jobs/${jobId}/download/${encodedFilename}`);
    
    // Check if response contains download_url (presigned URL)
    if (response.data.download_url) {
      // Use presigned URL directly
      const downloadUrl = response.data.download_url;
      const downloadFilename = response.data.filename || filename;
      
      // Create link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = downloadFilename;
      link.target = '_blank';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
      
      return;
    }
    
    // Fallback: Legacy blob download (for local files during migration)
    // This handles the case where backend returns FileResponse instead of presigned URL
    const blobResponse = await fetch(`/${lang}/api/jobs/${jobId}/download/${encodedFilename}`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${token}`,
      },
    });
    
    if (!blobResponse.ok) {
      const errorText = await blobResponse.text();
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.detail || 'Download failed');
      } catch {
        throw new Error(`Download failed: ${blobResponse.status} ${blobResponse.statusText}`);
      }
    }
    
    // Get filename from Content-Disposition header
    const contentDisposition = blobResponse.headers.get('content-disposition');
    let downloadFilename = filename;
    
    if (contentDisposition) {
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
    const blob = await blobResponse.blob();
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
