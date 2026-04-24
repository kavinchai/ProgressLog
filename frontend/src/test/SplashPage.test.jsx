import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SplashPage from '../pages/SplashPage';

vi.mock('../pages/SplashPage.css', () => ({}));

function renderSplash() {
  return render(
    <MemoryRouter>
      <SplashPage />
    </MemoryRouter>
  );
}

describe('SplashPage', () => {
  it('renders the app name', () => {
    renderSplash();
    expect(screen.getAllByText(/fittrack/i).length).toBeGreaterThan(0);
  });

  it('renders a Sign In link pointing to /login', () => {
    renderSplash();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });

  it('renders a Create Account link pointing to /login?mode=signup', () => {
    renderSplash();
    expect(screen.getByRole('link', { name: /create account/i })).toHaveAttribute('href', '/login?mode=signup');
  });

  it('shows the current date', () => {
    renderSplash();
    // Should render at least the year
    expect(screen.getByText(new RegExp(new Date().getFullYear().toString()))).toBeInTheDocument();
  });
});
