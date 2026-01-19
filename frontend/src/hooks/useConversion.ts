'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ConversionJob {
  id: string;
  original_filename: string;
  original_file_size: number;
  output_filename: string | null;
  output_file_size: number;
  status: 'pending' | 'queued' | 'analyzing' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  current_stage: string;
  container: string;
  hw_backend: string;
  crf: number;
  preset: string;
  audio_bitrate: string;
  needs_video_transcode: boolean | null;
  needs_audio_transcode: boolean | null;
  video_codec: string;
  audio_codec: string;
  created_at: string;
  completed_at: string | null;
  error_message: string;
}

export interface ConversionOptions {
  container: string;
  hw_backend: string;
  preset: string;
  crf: number;
  audio_bitrate: string;
  force_h264: boolean;
  allow_hevc: boolean;
  force_aac: boolean;
  keep_surround: boolean;
  integrity_check: boolean;
  deep_check: boolean;
}

export function useConversionJobs(lang: string) {
  return useQuery({
    queryKey: ['jobs', lang],
    queryFn: async () => {
      const response = await api.get<{ results: ConversionJob[] }>(`/${lang}/api/jobs/`);
      return response.data.results;
    },
    refetchInterval: 5000, // Poll every 5 seconds for active jobs
  });
}

export function useConversionJob(lang: string, jobId: string) {
  return useQuery({
    queryKey: ['job', lang, jobId],
    queryFn: async () => {
      const response = await api.get<ConversionJob>(`/${lang}/api/jobs/${jobId}/`);
      return response.data;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      // Poll more frequently for active jobs
      const data = query.state.data;
      if (data?.status === 'processing' || data?.status === 'analyzing') {
        return 1000;
      }
      return false;
    },
  });
}

export function useUploadFile(lang: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      options,
      onProgress,
    }: {
      file: File;
      options: ConversionOptions;
      onProgress?: (progress: number) => void;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      
      // Append options
      Object.entries(options).forEach(([key, value]) => {
        formData.append(key, String(value));
      });

      const response = await api.post<ConversionJob>(`/${lang}/api/upload/`, formData, {
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', lang] });
    },
  });
}

export function useCancelJob(lang: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await api.post(`/${lang}/api/jobs/${jobId}/cancel/`);
      return response.data;
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['job', lang, jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs', lang] });
    },
  });
}

export function useDeleteJob(lang: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await api.delete(`/${lang}/api/jobs/${jobId}/`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', lang] });
    },
  });
}

export function useConversionOptions(lang: string) {
  return useQuery({
    queryKey: ['options', lang],
    queryFn: async () => {
      const response = await api.get(`/${lang}/api/options/`);
      return response.data;
    },
    staleTime: Infinity, // Options don't change often
  });
}

export function useUserStats(lang: string) {
  return useQuery({
    queryKey: ['stats', lang],
    queryFn: async () => {
      const response = await api.get(`/${lang}/api/stats/`);
      return response.data;
    },
  });
}
