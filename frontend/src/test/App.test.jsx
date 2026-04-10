import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import useAuthStore from '../store/authStore';

// Stub all page/layout components to keep tests fast and focused on routing
vi.mock('../pages/Login',       () => ({ default: () => <div>Login Page</div> }));
vi.mock('../pages/Today',       () => ({ default: () => <div>Today Page</div> }));
vi.mock('../pages/WeeklyStats', () => ({ default: () => <div>Weekly Stats Page</div> }));
vi.mock('../pages/TotalStats',  () => ({ default: () => <div>Total Stats Page</div> }));
vi.mock('../pages/Strength',    () => ({ default: () => <div>Strength Page</div> }));
vi.mock('../pages/Templates',   () => ({ default: () => <div>Templates Page</div> }));
vi.mock('../pages/Settings',    () => ({ default: () => <div>Settings Page</div> }));
vi.mock('../components/layout/Sidebar', () => ({ default: () => <nav>Sidebar</nav> }));
vi.mock('../components/layout/Navbar',  () => ({ default: () => <nav>Navbar</nav> }));

beforeEach(() => {
  useAuthStore.setState({ token: null, username: null });
});


describe('App routing — unauthenticated', () => {
  it('shows Login when there is no token', () => {
    render(<App />);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('does NOT show the app layout without a token', () => {
    render(<App />);
    expect(screen.queryByText('Sidebar')).not.toBeInTheDocument();
    expect(screen.queryByText('Navbar')).not.toBeInTheDocument();
  });
});

describe('App routing — authenticated', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: 'jwt-abc', username: 'alice' });
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
});

describe('App routing — auth store reactivity', () => {
  it('switches from Login to app layout when a token is set', async () => {
    render(<App />);
    expect(screen.getByText('Login Page')).toBeInTheDocument();

    // Simulate login
    useAuthStore.setState({ token: 'new-tok', username: 'bob' });

    // App re-renders based on Zustand subscription
    await screen.findByText('Today Page');
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});
