import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import useAuthStore from '../store/authStore';

// Stub all page/layout components to keep tests fast and focused on routing
vi.mock('../pages/Leaderboard', () => ({ default: () => <div>Leaderboard Page</div> }));
vi.mock('../pages/SplashPage',  () => ({ default: () => <div>Splash Page</div> }));
vi.mock('../pages/Login',       () => ({ default: () => <div>Login Page</div> }));
vi.mock('../pages/Today',       () => ({ default: () => <div>Today Page</div> }));
vi.mock('../pages/WeeklyStats', () => ({ default: () => <div>Weekly Stats Page</div> }));
vi.mock('../pages/TotalStats',  () => ({ default: () => <div>Total Stats Page</div> }));
vi.mock('../pages/Strength',    () => ({ default: () => <div>Strength Page</div> }));
vi.mock('../pages/Cardio',      () => ({ default: () => <div>Cardio Page</div> }));
vi.mock('../pages/Templates',   () => ({ default: () => <div>Templates Page</div> }));
vi.mock('../pages/Settings',    () => ({ default: () => <div>Settings Page</div> }));
vi.mock('../components/layout/Sidebar', () => ({ default: () => <nav>Sidebar</nav> }));
vi.mock('../components/layout/Navbar',  () => ({ default: () => <nav>Navbar</nav> }));

beforeEach(() => {
  useAuthStore.setState({ authenticated: false, username: null });
});


describe('App routing — unauthenticated', () => {
  it('shows Leaderboard at / when not authenticated', () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.getByText('Leaderboard Page')).toBeInTheDocument();
  });

  it('shows SplashPage at /splash when not authenticated', () => {
    window.history.pushState({}, '', '/splash');
    render(<App />);
    expect(screen.getByText('Splash Page')).toBeInTheDocument();
  });

  it('shows Login at /login when not authenticated', () => {
    window.history.pushState({}, '', '/login');
    render(<App />);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('does NOT show the app layout without authentication', () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.queryByText('Sidebar')).not.toBeInTheDocument();
    expect(screen.queryByText('Navbar')).not.toBeInTheDocument();
  });
});

describe('App routing — authenticated', () => {
  beforeEach(() => {
    useAuthStore.setState({ authenticated: true, username: 'alice' });
  });

  it('shows the app layout (Sidebar + Navbar) when authenticated', () => {
    render(<App />);
    expect(screen.getByText('Sidebar')).toBeInTheDocument();
    expect(screen.getByText('Navbar')).toBeInTheDocument();
  });

  it('does NOT show Login page when authenticated', () => {
    render(<App />);
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('renders Today page at the default route', () => {
    render(<App />);
    expect(screen.getByText('Today Page')).toBeInTheDocument();
  });

  it('routes History to weekly stats by default', async () => {
    window.history.pushState({}, '', '/history');
    render(<App />);
    expect(await screen.findByText('Weekly Stats Page')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Weekly' })).toHaveAttribute('href', '/history/weekly');
    expect(screen.getByRole('link', { name: 'Total' })).toHaveAttribute('href', '/history/total');
  });

  it('routes History total tab to total stats', async () => {
    window.history.pushState({}, '', '/history/total');
    render(<App />);
    expect(await screen.findByText('Total Stats Page')).toBeInTheDocument();
  });

  it('routes Progress to strength by default', async () => {
    window.history.pushState({}, '', '/progress');
    render(<App />);
    expect(await screen.findByText('Strength Page')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Strength' })).toHaveAttribute('href', '/progress/strength');
    expect(screen.getByRole('link', { name: 'Cardio' })).toHaveAttribute('href', '/progress/cardio');
  });

  it('routes Progress cardio tab to cardio progress', async () => {
    window.history.pushState({}, '', '/progress/cardio');
    render(<App />);
    expect(await screen.findByText('Cardio Page')).toBeInTheDocument();
  });

  it('keeps old progress URLs working through redirects', async () => {
    window.history.pushState({}, '', '/strength');
    render(<App />);
    expect(await screen.findByText('Strength Page')).toBeInTheDocument();
  });
});

describe('App routing — auth store reactivity', () => {
  it('switches from Leaderboard to app layout when authenticated', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.getByText('Leaderboard Page')).toBeInTheDocument();

    // Simulate login
    useAuthStore.setState({ authenticated: true, username: 'bob' });

    // App re-renders based on Zustand subscription; / redirects to /today
    await screen.findByText('Today Page');
    expect(screen.queryByText('Leaderboard Page')).not.toBeInTheDocument();
  });
});
