import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

function renderLogin(path = '/login') {
  return render(<MemoryRouter initialEntries={[path]}><Login /></MemoryRouter>);
}

// ── Login mode ────────────────────────────────────────────────────────────────

describe('Login — login mode', () => {
  it('renders username and password fields', () => {
    renderLogin();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('does NOT render an email field in login mode', () => {
    renderLogin();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });

  it('renders a Sign In button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('calls login and stores token on success', async () => {
    api.post.mockResolvedValue({ data: { token: 'jwt-abc', username: 'alice' } });

    renderLogin();
    await userEvent.type(screen.getByLabelText(/username/i), 'alice');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(useAuthStore.getState().token).toBe('jwt-abc');
      expect(useAuthStore.getState().username).toBe('alice');
    });
  });

  it('calls /auth/login endpoint on submit', async () => {
    api.post.mockResolvedValue({ data: { token: 'tok', username: 'alice' } });

    renderLogin();
    await userEvent.type(screen.getByLabelText(/username/i), 'alice');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      '/auth/login',
      { username: 'alice', password: 'secret' }
    ));
  });

  it('shows error message on failed login', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Bad credentials' } } });

    renderLogin();
    await userEvent.type(screen.getByLabelText(/username/i), 'alice');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/bad credentials/i)).toBeInTheDocument();
    });
  });

  it('shows HTTP status error message when no message in response', async () => {
    api.post.mockRejectedValue({ response: { status: 500 } });

    renderLogin();
    await userEvent.type(screen.getByLabelText(/username/i), 'alice');
    await userEvent.type(screen.getByLabelText(/password/i), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/HTTP 500/i)).toBeInTheDocument();
    });
  });

  it('shows fallback error when response has no message', async () => {
    api.post.mockRejectedValue({});

    renderLogin();
    await userEvent.type(screen.getByLabelText(/username/i), 'alice');
    await userEvent.type(screen.getByLabelText(/password/i), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument();
    });
  });
});

// ── Signup mode ───────────────────────────────────────────────────────────────

describe('Login — signup mode', () => {
  async function switchToSignup() {
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: /don't have an account/i }));
  }

  it('clicking "sign up" link shows the email field', async () => {
    await switchToSignup();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('renders a Create Account submit button in signup mode', async () => {
    await switchToSignup();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('successful signup calls /auth/register with email and stores token', async () => {
    api.post.mockResolvedValue({ data: { token: 'signup-tok', username: 'bob' } });

    await switchToSignup();
    await userEvent.type(screen.getByLabelText(/username/i), 'bob');
    await userEvent.type(screen.getByLabelText(/email/i), 'bob@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'pass123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        username: 'bob',
        password: 'pass123',
        email: 'bob@example.com',
      });
      expect(useAuthStore.getState().token).toBe('signup-tok');
      expect(useAuthStore.getState().username).toBe('bob');
    });
  });

  it('failed signup shows the server error message', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Username already taken' } } });

    await switchToSignup();
    await userEvent.type(screen.getByLabelText(/username/i), 'bob');
    await userEvent.type(screen.getByLabelText(/email/i), 'bob@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'pass123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/username already taken/i)).toBeInTheDocument();
    });
  });

  it('failed signup with HTTP status shows registration error', async () => {
    api.post.mockRejectedValue({ response: { status: 409 } });

    await switchToSignup();
    await userEvent.type(screen.getByLabelText(/username/i), 'bob');
    await userEvent.type(screen.getByLabelText(/email/i), 'bob@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/registration failed.*HTTP 409/i)).toBeInTheDocument();
    });
  });

  it('failed signup with no response shows fallback error', async () => {
    api.post.mockRejectedValue({});

    await switchToSignup();
    await userEvent.type(screen.getByLabelText(/username/i), 'bob');
    await userEvent.type(screen.getByLabelText(/email/i), 'bob@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/registration failed/i)).toBeInTheDocument();
    });
  });

  it('switching back to login mode removes email field', async () => {
    await switchToSignup();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /already have an account.*sign in/i }));
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });

  it('switching mode clears existing error', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Bad credentials' } } });

    renderLogin();
    await userEvent.type(screen.getByLabelText(/username/i), 'alice');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(screen.getByText(/bad credentials/i)).toBeInTheDocument());

    // Switch to signup — error should be gone
    await userEvent.click(screen.getByRole('button', { name: /don't have an account/i }));
    expect(screen.queryByText(/bad credentials/i)).not.toBeInTheDocument();
  });

  it('opens directly in signup mode when ?mode=signup is in the URL', () => {
    renderLogin('/login?mode=signup');
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });
});
