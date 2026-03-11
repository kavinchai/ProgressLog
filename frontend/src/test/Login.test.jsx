import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../pages/Login';
import useAuthStore from '../store/authStore';

vi.mock('../api', () => ({
  default: { post: vi.fn() },
}));
vi.mock('../pages/Login.css', () => ({}));

import api from '../api';

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ token: null, username: null });
});

describe('Login', () => {
  it('renders username and password fields', () => {
    render(<Login />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders a Log In button', () => {
    render(<Login />);
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('calls login and stores token on success', async () => {
    api.post.mockResolvedValue({ data: { token: 'jwt-abc', username: 'alice' } });

    render(<Login />);
    await userEvent.type(screen.getByLabelText(/username/i), 'alice');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(useAuthStore.getState().token).toBe('jwt-abc');
      expect(useAuthStore.getState().username).toBe('alice');
    });
  });

  it('shows error message on failed login', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Bad credentials' } } });

    render(<Login />);
    await userEvent.type(screen.getByLabelText(/username/i), 'alice');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText(/bad credentials/i)).toBeInTheDocument();
    });
  });

  it('shows fallback error when response has no message', async () => {
    api.post.mockRejectedValue({});

    render(<Login />);
    await userEvent.type(screen.getByLabelText(/username/i), 'alice');
    await userEvent.type(screen.getByLabelText(/password/i), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument();
    });
  });
});
