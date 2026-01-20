import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/[lang]/auth/login/page';
import { api } from '@/lib/api';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: () => ({ lang: 'en' }),
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: jest.fn(),
}));

// Mock api
jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ...actual,
    api: {
      post: jest.fn(),
      get: jest.fn().mockResolvedValue({ data: [] }),
    },
  };
});

describe('LoginPage local login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls backend login endpoint with lang-prefixed URL', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { token: 'test-token', requires_2fa: false },
    });

    render(<LoginPage />);

    // Remplir le formulaire
    const emailInput = screen.getByPlaceholderText(/you@example.com or username/i);
    const passwordInput = screen.getByPlaceholderText(/•+/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'secret' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    });

    const calledUrl = (api.post as jest.Mock).mock.calls[0][0];
    expect(calledUrl).toBe('/en/api/auth/login/');
  });
});

