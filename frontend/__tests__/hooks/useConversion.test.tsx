import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useConversionJobs, useConversionJob } from '@/hooks/useConversion';

// Mock the API
jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn().mockImplementation((url: string) => {
      if (url.includes('/jobs/')) {
        if (url.includes('test-job-id')) {
          return Promise.resolve({
            data: {
              id: 'test-job-id',
              original_filename: 'test.mkv',
              status: 'completed',
              progress: 100,
            },
          });
        }
        return Promise.resolve({
          data: {
            results: [
              { id: '1', original_filename: 'file1.mkv', status: 'completed' },
              { id: '2', original_filename: 'file2.mkv', status: 'processing' },
            ],
          },
        });
      }
      return Promise.resolve({ data: {} });
    }),
    post: jest.fn().mockResolvedValue({ data: { id: 'new-job' } }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useConversionJobs', () => {
  it('fetches list of jobs', async () => {
    const { result } = renderHook(() => useConversionJobs('en'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
  });

  it('returns loading state initially', () => {
    const { result } = renderHook(() => useConversionJobs('en'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });
});

describe('useConversionJob', () => {
  it('fetches a single job', async () => {
    const { result } = renderHook(
      () => useConversionJob('en', 'test-job-id'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data?.id).toBe('test-job-id');
  });

  it('does not fetch when jobId is empty', () => {
    const { result } = renderHook(
      () => useConversionJob('en', ''),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(false);
  });
});
