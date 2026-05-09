import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import useAuthStore from '../store/authStore';

vi.mock('../api', () => ({
  default: { post: vi.fn() },
}));

vi.mock('../hooks/useTheme', () => ({
  default: () => [false, vi.fn()],
}));

beforeEach(() => {
  useAuthStore.setState({ authenticated: true, username: 'alice' });
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
    expect(within(nav).getByRole('link', { name: 'Templates' })).toHaveAttribute('href', '/templates');
    expect(within(nav).getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');

    expect(within(nav).queryByRole('link', { name: 'Weekly Stats' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Total Stats' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Strength' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Cardio' })).not.toBeInTheDocument();
  });

  it('uses the same top-level split in the mobile menu', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Menu' }));
    const nav = screen.getByRole('navigation');

    expect(within(nav).getByRole('link', { name: 'Today' })).toHaveAttribute('href', '/today');
    expect(within(nav).getByRole('link', { name: 'History' })).toHaveAttribute('href', '/history');
    expect(within(nav).getByRole('link', { name: 'Progress' })).toHaveAttribute('href', '/progress');
    expect(within(nav).getByRole('link', { name: 'Templates' })).toHaveAttribute('href', '/templates');
    expect(within(nav).getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');

    expect(within(nav).queryByRole('link', { name: 'Weekly Stats' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Total Stats' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Strength' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Cardio' })).not.toBeInTheDocument();
  });
});
