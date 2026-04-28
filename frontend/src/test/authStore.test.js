import { beforeEach, describe, expect, it } from 'vitest';
import useAuthStore from '../store/authStore';

beforeEach(() => {
  useAuthStore.setState({ authenticated: false, username: null });
});

describe('authStore', () => {
  it('starts with no authentication', () => {
    const { authenticated, username } = useAuthStore.getState();
    expect(authenticated).toBe(false);
    expect(username).toBeNull();
  });

  it('login sets authenticated and username', () => {
    useAuthStore.getState().login('alice');
    const { authenticated, username } = useAuthStore.getState();
    expect(authenticated).toBe(true);
    expect(username).toBe('alice');
  });

  it('logout clears authenticated and username', () => {
    useAuthStore.getState().login('alice');
    useAuthStore.getState().logout();
    const { authenticated, username } = useAuthStore.getState();
    expect(authenticated).toBe(false);
    expect(username).toBeNull();
  });
});
