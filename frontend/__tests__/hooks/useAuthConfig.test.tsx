import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isAuthRequired, useAuthConfig, useRequireAuth } from '@/hooks/useAuthConfig';

// Mock the API
jest.mock('@/lib/api', () => ({
  getCurrentLang: () => 'en',
  api: {
    get: jest.fn().mockResolvedValue({
      data: {
        require_auth: false,
        providers: ['google', 'github'],
        user: {
          id: 1,
          email: 'test@example.com',
          username: 'testuser',
          subscription_tier: 'free',
        },
      },
    }),
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

describe('isAuthRequired', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns true when NEXT_PUBLIC_REQUIRE_AUTH is not set', () => {
    delete process.env.NEXT_PUBLIC_REQUIRE_AUTH;
    expect(isAuthRequired()).toBe(true);
  });

  it('returns false when NEXT_PUBLIC_REQUIRE_AUTH is "false"', () => {
    process.env.NEXT_PUBLIC_REQUIRE_AUTH = 'false';
    expect(isAuthRequired()).toBe(false);
  });

  it('returns false when NEXT_PUBLIC_REQUIRE_AUTH is "0"', () => {
    process.env.NEXT_PUBLIC_REQUIRE_AUTH = '0';
    expect(isAuthRequired()).toBe(false);
  });

  it('returns true when NEXT_PUBLIC_REQUIRE_AUTH is "true"', () => {
    process.env.NEXT_PUBLIC_REQUIRE_AUTH = 'true';
    expect(isAuthRequired()).toBe(true);
  });
});

describe('useAuthConfig', () => {
  it('fetches auth configuration', async () => {
    const { result } = renderHook(() => useAuthConfig(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data?.providers).toContain('google');
  });
});

describe('useRequireAuth', () => {
  it('returns requireAuth based on config', async () => {
    const { result } = renderHook(() => useRequireAuth(), {
      wrapper: createWrapper(),
    });

    // Should immediately return a value (not block)
    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.requireAuth).toBe('boolean');
  });

  it('never blocks on loading', () => {
    const { result } = renderHook(() => useRequireAuth(), {
      wrapper: createWrapper(),
    });

    // isLoading should always be false
    expect(result.current.isLoading).toBe(false);
  });
});
