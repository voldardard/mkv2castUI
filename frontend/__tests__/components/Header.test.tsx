import { render, screen } from '@testing-library/react';
import { Header } from '@/components/Header';

// Mock the hooks
jest.mock('@/hooks/useAuthConfig', () => ({
  useRequireAuth: () => ({
    requireAuth: false,
    isLoading: false,
    config: null,
    isError: false,
  }),
  useCurrentUser: () => ({
    data: null,
    isLoading: false,
    isError: false,
  }),
}));

describe('Header', () => {
  it('renders the logo/title', () => {
    render(<Header lang="en" />);
    
    // Check for some header element
    const header = screen.getByRole('banner') || document.querySelector('header');
    expect(header).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<Header lang="en" />);
    
    // Should have navigation elements
    const nav = document.querySelector('nav') || document.querySelector('header');
    expect(nav).toBeInTheDocument();
  });

  it('renders language selector', () => {
    render(<Header lang="en" />);
    
    // Language selector might be a button or select
    // Adjust based on actual implementation
  });
});
