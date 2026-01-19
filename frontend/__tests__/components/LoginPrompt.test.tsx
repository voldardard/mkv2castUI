import { render, screen } from '@testing-library/react';
import { LoginPrompt } from '@/components/LoginPrompt';

// Default mock - auth required
const mockUseRequireAuth = jest.fn(() => ({
  requireAuth: true,
  isLoading: false,
  config: null,
  isError: false,
}));

jest.mock('@/hooks/useAuthConfig', () => ({
  useRequireAuth: () => mockUseRequireAuth(),
}));

describe('LoginPrompt', () => {
  beforeEach(() => {
    mockUseRequireAuth.mockClear();
  });

  describe('when auth is required', () => {
    beforeEach(() => {
      mockUseRequireAuth.mockReturnValue({
        requireAuth: true,
        isLoading: false,
        config: null,
        isError: false,
      });
    });

    it('renders login prompt', () => {
      render(<LoginPrompt lang="en" />);
      
      // Should show sign in text
      expect(screen.getByText(/Sign in to continue/i)).toBeInTheDocument();
    });

    it('shows Google login button', () => {
      render(<LoginPrompt lang="en" />);
      
      expect(screen.getByText(/Continue with Google/i)).toBeInTheDocument();
    });

    it('shows GitHub login button', () => {
      render(<LoginPrompt lang="en" />);
      
      expect(screen.getByText(/Continue with GitHub/i)).toBeInTheDocument();
    });

    it('shows terms text', () => {
      render(<LoginPrompt lang="en" />);
      
      expect(screen.getByText(/Terms of Service/i)).toBeInTheDocument();
    });
  });

  describe('when auth is disabled', () => {
    beforeEach(() => {
      mockUseRequireAuth.mockReturnValue({
        requireAuth: false,
        isLoading: false,
        config: null,
        isError: false,
      });
    });

    it('renders nothing', () => {
      const { container } = render(<LoginPrompt lang="en" />);
      
      // Should be empty when auth is disabled
      expect(container.firstChild).toBeNull();
    });
  });
});
