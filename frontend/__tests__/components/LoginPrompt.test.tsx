import { render, screen, waitFor } from '@testing-library/react';
import { LoginPrompt } from '@/components/LoginPrompt';
import { api } from '@/lib/api';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  })),
}));

// Mock the API
jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
  },
}));

// Mock i18n
jest.mock('@/lib/i18n', () => ({
  useTranslations: jest.fn((lang: string) => {
    const translations: Record<string, string> = {
      'login.title': 'Sign in to continue',
      'login.subtitle': 'Create an account to start converting your videos',
      'login.email': 'Sign in with Email',
      'login.google': 'Continue with Google',
      'login.github': 'Continue with GitHub',
      'login.terms': 'By signing in, you agree to our Terms of Service and Privacy Policy',
    };
    return (key: string) => translations[key] || key;
  }),
}));

// Default mock - auth required
const mockUseRequireAuth = jest.fn(() => ({
  requireAuth: true,
  isLoading: false,
  config: null,
  isError: false,
}));

const mockUseCurrentUser = jest.fn(() => ({
  data: null,
  isLoading: false,
  isError: false,
}));

jest.mock('@/hooks/useAuthConfig', () => ({
  useRequireAuth: () => mockUseRequireAuth(),
  useCurrentUser: () => mockUseCurrentUser(),
}));

describe('LoginPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRequireAuth.mockClear();
    mockUseCurrentUser.mockClear();
    
    // Mock OAuth providers API
    (api.get as jest.Mock).mockResolvedValue({
      data: [
        { id: 'google', name: 'Google', url: '/api/auth/google/login/' },
        { id: 'github', name: 'GitHub', url: '/api/auth/github/login/' },
      ],
    });
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

    it('shows Google login button', async () => {
      render(<LoginPrompt lang="en" />);
      
      // Wait for providers to load
      await waitFor(() => {
        expect(screen.getByText(/Continue with Google/i)).toBeInTheDocument();
      });
    });

    it('shows GitHub login button', async () => {
      render(<LoginPrompt lang="en" />);
      
      // Wait for providers to load
      await waitFor(() => {
        expect(screen.getByText(/Continue with GitHub/i)).toBeInTheDocument();
      });
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
