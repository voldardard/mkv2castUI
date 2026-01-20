import { render, screen, waitFor } from '@testing-library/react';
import { ProgressTracker } from '@/components/ProgressTracker';
import { api } from '@/lib/api';

// Mock the useWebSocket hook
jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(() => ({
    lastMessage: null,
    connectionStatus: 'connected',
    send: jest.fn(),
  })),
}));

// Mock the API
jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
  },
  downloadFile: jest.fn(),
}));

describe('ProgressTracker', () => {
  const defaultProps = {
    lang: 'en',
    jobIds: ['test-job-123'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock: return a valid job
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        id: 'test-job-123',
        original_filename: 'test.mkv',
        status: 'pending',
        progress: 0,
        current_stage: 'queued',
      },
    });
  });

  it('renders without crashing', () => {
    render(<ProgressTracker {...defaultProps} />);
    
    // Component should render
    expect(document.body).toBeInTheDocument();
  });

  it('shows loading state for new job', () => {
    render(<ProgressTracker {...defaultProps} />);
    
    // Should display loading text for new job initially
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  it('shows no jobs message when empty', () => {
    render(<ProgressTracker lang="en" jobIds={[]} />);
    
    // Should show the "no jobs" message
    expect(screen.getByText(/No active conversions/i)).toBeInTheDocument();
  });

  it('renders multiple jobs', async () => {
    // Mock API responses for multiple jobs
    (api.get as jest.Mock).mockImplementation((url: string) => {
      // Extract jobId from URL like '/en/api/jobs/job-1/'
      const match = url.match(/\/jobs\/([^\/]+)\//);
      const jobId = match ? match[1] : 'unknown';
      return Promise.resolve({
        data: {
          id: jobId,
          original_filename: `${jobId}.mkv`,
          status: 'pending',
          progress: 0,
          current_stage: 'queued',
        },
      });
    });

    render(<ProgressTracker lang="en" jobIds={['job-1', 'job-2', 'job-3']} />);
    
    // Initially shows loading, then loads jobs
    // After jobs are loaded, should show job filenames
    await waitFor(() => {
      expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Should show job filenames after loading
    await waitFor(() => {
      expect(screen.getByText(/job-1\.mkv/)).toBeInTheDocument();
      expect(screen.getByText(/job-2\.mkv/)).toBeInTheDocument();
      expect(screen.getByText(/job-3\.mkv/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
