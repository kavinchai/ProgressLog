import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import ResetPassword from '../pages/ResetPassword';

vi.mock('../api', () => ({
  default: { post: vi.fn() },
}));
vi.mock('../pages/Login.css', () => ({}));

import api from '../api';

beforeEach(() => {
  vi.clearAllMocks();
});

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ResetPassword />
    </MemoryRouter>
  );
}

describe('ResetPassword page', () => {
  it('shows an error when no token is in the URL', () => {
    renderAt('/reset-password');
    expect(screen.getByText(/invalid or missing reset link/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
  });

  it('renders a new-password form when a token is in the URL', () => {
    renderAt('/reset-password?token=abc123');
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  it('blocks submit when the two passwords do not match', async () => {
    renderAt('/reset-password?token=abc123');
    await userEvent.type(screen.getByLabelText(/new password/i), 'abcdef');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different');
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('posts token + newPassword on submit', async () => {
    api.post.mockResolvedValue({ status: 204 });

    renderAt('/reset-password?token=abc123');
    await userEvent.type(screen.getByLabelText(/new password/i), 'newpass1');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpass1');
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      '/auth/reset-password',
      { token: 'abc123', newPassword: 'newpass1' }
    ));
  });

  it('shows a success message and a sign-in link after a successful reset', async () => {
    api.post.mockResolvedValue({ status: 204 });

    renderAt('/reset-password?token=abc123');
    await userEvent.type(screen.getByLabelText(/new password/i), 'newpass1');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpass1');
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText(/your password has been reset/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  it('shows an error when the backend rejects the token (expired/used/unknown)', async () => {
    api.post.mockRejectedValue({ response: { status: 400, data: { message: 'Invalid or expired reset link.' } } });

    renderAt('/reset-password?token=stale');
    await userEvent.type(screen.getByLabelText(/new password/i), 'newpass1');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpass1');
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid or expired reset link/i)).toBeInTheDocument();
    });
  });
});
