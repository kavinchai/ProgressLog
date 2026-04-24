import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SplashPage from '../pages/SplashPage';
import motivations from '../data/motivations.json';

vi.mock('../pages/SplashPage.css', () => ({}));
vi.mock('../data/motivations.json', () => ({ default: ['Quote A', 'Quote B', 'Quote C'] }));

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
    expect(screen.getAllByText(/progresslog/i).length).toBeGreaterThan(0);
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
    expect(screen.getByText(new RegExp(new Date().getFullYear().toString()))).toBeInTheDocument();
  });

  it('renders a motivational quote from the JSON', () => {
    renderSplash();
    const shown = motivations.some(q => screen.queryByText(q));
    expect(shown).toBe(true);
  });
});
