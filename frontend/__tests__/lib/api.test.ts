import { api, uploadFile, getJobs, getJob, cancelJob, deleteJob } from '@/lib/api';

describe('API client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates axios instance', () => {
    expect(api).toBeDefined();
  });

  it('has withCredentials enabled', () => {
    // Check that the api instance has withCredentials set
    // This tests the actual axios instance created by the module
    expect(api.defaults.withCredentials).toBe(true);
  });

  it('has correct base URL from environment', () => {
    // baseURL is set from NEXT_PUBLIC_API_URL or empty string
    expect(api.defaults.baseURL).toBeDefined();
  });

  it('has correct content type header', () => {
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
  });
});

describe('uploadFile', () => {
  it('posts to upload endpoint with FormData', async () => {
    const mockPost = jest.fn().mockResolvedValue({ data: { id: 'new-job' } });
    api.post = mockPost;

    const file = new File(['test content'], 'test.mkv', { type: 'video/x-matroska' });
    const options = { container: 'mp4' };

    await uploadFile('en', file, options);

    expect(mockPost).toHaveBeenCalledWith(
      '/en/api/upload/',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
  });

  it('calls onProgress callback', async () => {
    const mockPost = jest.fn().mockImplementation((url, data, config) => {
      // Simulate progress callback
      if (config.onUploadProgress) {
        config.onUploadProgress({ loaded: 50, total: 100 });
      }
      return Promise.resolve({ data: { id: 'new-job' } });
    });
    api.post = mockPost;

    const file = new File(['test'], 'test.mkv');
    const onProgress = jest.fn();

    await uploadFile('en', file, {}, onProgress);

    expect(onProgress).toHaveBeenCalledWith(50);
  });
});

describe('getJobs', () => {
  it('fetches jobs from correct endpoint', async () => {
    const mockGet = jest.fn().mockResolvedValue({ data: [] });
    api.get = mockGet;

    await getJobs('en');

    expect(mockGet).toHaveBeenCalledWith('/en/api/jobs/');
  });
});

describe('getJob', () => {
  it('fetches single job by ID', async () => {
    const mockGet = jest.fn().mockResolvedValue({ data: { id: 'test-id' } });
    api.get = mockGet;

    await getJob('en', 'test-id');

    expect(mockGet).toHaveBeenCalledWith('/en/api/jobs/test-id/');
  });
});

describe('cancelJob', () => {
  it('posts to cancel endpoint', async () => {
    const mockPost = jest.fn().mockResolvedValue({ data: {} });
    api.post = mockPost;

    await cancelJob('en', 'test-id');

    expect(mockPost).toHaveBeenCalledWith('/en/api/jobs/test-id/cancel/');
  });
});

describe('deleteJob', () => {
  it('deletes job by ID', async () => {
    const mockDelete = jest.fn().mockResolvedValue({ data: {} });
    api.delete = mockDelete;

    await deleteJob('en', 'test-id');

    expect(mockDelete).toHaveBeenCalledWith('/en/api/jobs/test-id/');
  });
});
