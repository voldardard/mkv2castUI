import { render, screen } from '@testing-library/react';
import { ProgressTracker } from '@/components/ProgressTracker';

// Mock the useWebSocket hook
jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(() => ({
    lastMessage: null,
    connectionStatus: 'connected',
    send: jest.fn(),
  })),
}));

describe('ProgressTracker', () => {
  const defaultProps = {
    lang: 'en',
    jobIds: ['test-job-123'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ProgressTracker {...defaultProps} />);
    
    // Component should render
    expect(document.body).toBeInTheDocument();
  });

  it('shows loading state for new job', () => {
    render(<ProgressTracker {...defaultProps} />);
    
    // Should display loading text for new job
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  it('shows no jobs message when empty', () => {
    render(<ProgressTracker lang="en" jobIds={[]} />);
    
    // Should show the "no jobs" message
    expect(screen.getByText(/No active conversions/i)).toBeInTheDocument();
  });

  it('renders multiple jobs', () => {
    render(<ProgressTracker lang="en" jobIds={['job-1', 'job-2', 'job-3']} />);
    
    // Should have multiple loading entries
    const loadingElements = screen.getAllByText(/Loading/);
    expect(loadingElements).toHaveLength(3);
  });
});
