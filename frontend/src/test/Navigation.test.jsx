import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import BottomTabBar from '../components/layout/BottomTabBar';
import useAuthStore from '../store/authStore';

vi.mock('../api', () => ({
  default: { post: vi.fn() },
}));

const setDark = vi.fn();
vi.mock('../hooks/useTheme', () => ({
  default: () => [false, setDark],
}));

beforeEach(() => {
  useAuthStore.setState({ authenticated: true, username: 'alice' });
  setDark.mockClear();
});

describe('main navigation', () => {
  it('shows the cleaner top-level split in the desktop sidebar', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>,
    );

    const nav = screen.getByRole('navigation');
    expect(within(nav).getByRole('link', { name: 'Today' })).toHaveAttribute('href', '/today');
    expect(within(nav).getByRole('link', { name: 'History' })).toHaveAttribute('href', '/history');
    expect(within(nav).getByRole('link', { name: 'Progress' })).toHaveAttribute('href', '/progress');
    expect(within(nav).getByRole('link', { name: 'Community' })).toHaveAttribute('href', '/community');
    expect(within(nav).getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');

    expect(within(nav).queryByRole('link', { name: 'Weekly Stats' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Total Stats' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Strength' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Cardio' })).not.toBeInTheDocument();
  });

  it('uses the same top-level split in the mobile bottom tab bar', () => {
    render(
      <BrowserRouter>
        <BottomTabBar />
      </BrowserRouter>,
    );

    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(within(nav).getByRole('link', { name: 'Today' })).toHaveAttribute('href', '/today');
    expect(within(nav).getByRole('link', { name: 'History' })).toHaveAttribute('href', '/history');
    expect(within(nav).getByRole('link', { name: 'Progress' })).toHaveAttribute('href', '/progress');
    expect(within(nav).getByRole('link', { name: 'Community' })).toHaveAttribute('href', '/community');
    expect(within(nav).getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');

    // The bottom tab bar only surfaces the five primary destinations.
    expect(within(nav).getAllByRole('link')).toHaveLength(5);
    expect(within(nav).queryByRole('link', { name: 'Strength' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Cardio' })).not.toBeInTheDocument();
  });

  it('mobile top bar exposes theme toggle and logout (no hamburger menu)', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>,
    );

    // The hamburger menu has been replaced by the bottom tab bar.
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument();

    // Theme + logout remain reachable from the slim top bar.
    await user.click(screen.getByRole('button', { name: /dark mode/i }));
    expect(setDark).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
  });
});
