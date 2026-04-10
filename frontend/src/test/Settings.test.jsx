import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Settings from '../pages/Settings';
import useAuthStore from '../store/authStore';

// Mock the CSS
vi.mock('../pages/Settings.css', () => ({}));

// Mock the api module directly (Settings.jsx calls api.get/post/put directly)
vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));

// Mock useUserProfile to control goals state
vi.mock('../hooks/useUserProfile', () => ({
  default: vi.fn(),
}));

import api from '../api';
import useUserProfile from '../hooks/useUserProfile';

const DEFAULT_GOALS = { calorieTargetTraining: 2600, calorieTargetRest: 2000, proteinTarget: 180 };

function setupProfile(overrides = {}) {
  useUserProfile.mockReturnValue({
    goals: DEFAULT_GOALS,
    loading: false,
    saving: false,
    error: null,
    saveGoals: vi.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ token: 'tok', username: 'alice' });
  // Default: email endpoint returns an email, profile verify is stubbed
  api.get.mockResolvedValue({ data: { email: 'alice@example.com' } });
});

describe('Settings — goals form', () => {
  it('shows loading indicator while goals are loading', () => {
    setupProfile({ loading: true });
    render(<Settings />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('populates form with goals from hook once loaded', () => {
    setupProfile();
    render(<Settings />);
    expect(screen.getByDisplayValue('2600')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('180')).toBeInTheDocument();
  });

  it('calls saveGoals with parsed integer values on submit', async () => {
    const saveGoals = vi.fn().mockResolvedValue({});
    setupProfile({ saveGoals });
    render(<Settings />);

    const trainingInput = screen.getByLabelText(/training day/i);
    await userEvent.clear(trainingInput);
    await userEvent.type(trainingInput, '2800');
    await userEvent.click(screen.getByRole('button', { name: /save goals/i }));

    await waitFor(() => {
      expect(saveGoals).toHaveBeenCalledWith({
        calorieTargetTraining: 2800,
        calorieTargetRest: 2000,
        proteinTarget: 180,
      });
    });
  });

  it('shows "saved." confirmation after successful save', async () => {
    const saveGoals = vi.fn().mockResolvedValue({});
    setupProfile({ saveGoals });
    render(<Settings />);

    await userEvent.click(screen.getByRole('button', { name: /save goals/i }));

    await waitFor(() => expect(screen.getByText(/saved\./i)).toBeInTheDocument());
  });

  it('shows hook error when saveGoals rejects', async () => {
    const saveGoals = vi.fn().mockRejectedValue(new Error('server error'));
    setupProfile({ error: 'Failed to save goals', saveGoals });
    render(<Settings />);

    expect(screen.getByText(/failed to save goals/i)).toBeInTheDocument();
  });
});

describe('Settings — account / password verification', () => {
  it('renders Current Password field by default (not yet verified)', () => {
    setupProfile();
    render(<Settings />);
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
  });

  it('does NOT show the credentials form before password is verified', () => {
    setupProfile();
    render(<Settings />);
    expect(screen.queryByLabelText(/new username/i)).not.toBeInTheDocument();
  });

  it('successful password verify reveals the credentials form', async () => {
    api.post.mockResolvedValue({});
    setupProfile();
    render(<Settings />);

    await userEvent.type(screen.getByLabelText(/current password/i), 'mypassword');
    await userEvent.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/new username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    });
  });

  it('wrong password shows verify error message', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Incorrect password.' } } });
    setupProfile();
    render(<Settings />);

    await userEvent.type(screen.getByLabelText(/current password/i), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => expect(screen.getByText(/incorrect password/i)).toBeInTheDocument());
    expect(screen.queryByLabelText(/new username/i)).not.toBeInTheDocument();
  });

  it('calls /profile/verify-password with current password', async () => {
    api.post.mockResolvedValue({});
    setupProfile();
    render(<Settings />);

    await userEvent.type(screen.getByLabelText(/current password/i), 'securepass');
    await userEvent.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      '/profile/verify-password',
      { password: 'securepass' }
    ));
  });
});

describe('Settings — updating credentials', () => {
  async function verifyPassword() {
    api.post.mockResolvedValue({});
    setupProfile();
    render(<Settings />);
    await userEvent.type(screen.getByLabelText(/current password/i), 'mypass');
    await userEvent.click(screen.getByRole('button', { name: /verify/i }));
    await waitFor(() => expect(screen.getByLabelText(/new username/i)).toBeInTheDocument());
  }

  it('shows validation error when saving with all fields empty', async () => {
    await verifyPassword();
    // Clear the email field that was pre-filled
    await userEvent.clear(screen.getByLabelText(/new email/i));
    await userEvent.click(screen.getByRole('button', { name: /save account/i }));

    await waitFor(() => expect(screen.getByText(/enter a new username/i)).toBeInTheDocument());
  });

  it('calls /profile/credentials when new username is provided', async () => {
    api.put.mockResolvedValue({ data: { token: 'new-tok', username: 'newbob' } });
    await verifyPassword();

    await userEvent.clear(screen.getByLabelText(/new email/i));
    await userEvent.type(screen.getByLabelText(/new username/i), 'newbob');
    await userEvent.click(screen.getByRole('button', { name: /save account/i }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith(
      '/profile/credentials',
      expect.objectContaining({ newUsername: 'newbob' })
    ));
  });

  it('calls /profile/email when new email is provided', async () => {
    api.put.mockResolvedValue({ data: { token: 'tok', username: 'alice' } });
    await verifyPassword();

    const emailInput = screen.getByLabelText(/new email/i);
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'newalice@example.com');
    await userEvent.click(screen.getByRole('button', { name: /save account/i }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith(
      '/profile/email',
      { email: 'newalice@example.com' }
    ));
  });

  it('resets to the verify-password form after a successful credential update', async () => {
    // After a successful update, the component resets passwordVerified → false,
    // which returns to the verify-password form (the credentials form disappears).
    api.put.mockResolvedValue({ data: { token: 'tok', username: 'alice' } });
    await verifyPassword();

    const emailInput = screen.getByLabelText(/new email/i);
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'newalice@example.com');
    await userEvent.click(screen.getByRole('button', { name: /save account/i }));

    // After success the credentials form is hidden and the password verify form reappears
    await waitFor(() => expect(screen.getByLabelText(/current password/i)).toBeInTheDocument());
    expect(screen.queryByLabelText(/new username/i)).not.toBeInTheDocument();
  });

  it('shows error when credential update fails', async () => {
    api.put.mockRejectedValue({ response: { data: { message: 'Username already exists' } } });
    await verifyPassword();

    await userEvent.type(screen.getByLabelText(/new username/i), 'taken');
    await userEvent.clear(screen.getByLabelText(/new email/i));
    await userEvent.click(screen.getByRole('button', { name: /save account/i }));

    await waitFor(() => expect(screen.getByText(/username already exists/i)).toBeInTheDocument());
  });
});
