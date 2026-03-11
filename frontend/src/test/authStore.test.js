import { beforeEach, describe, expect, it } from 'vitest';
import useAuthStore from '../store/authStore';

beforeEach(() => {
  useAuthStore.setState({ token: null, username: null });
});

describe('authStore', () => {
  it('starts with no token or username', () => {
    const { token, username } = useAuthStore.getState();
    expect(token).toBeNull();
    expect(username).toBeNull();
  });

  it('login sets token and username', () => {
    useAuthStore.getState().login('my-token', 'alice');
    const { token, username } = useAuthStore.getState();
    expect(token).toBe('my-token');
    expect(username).toBe('alice');
  });

  it('logout clears token and username', () => {
    useAuthStore.getState().login('my-token', 'alice');
    useAuthStore.getState().logout();
    const { token, username } = useAuthStore.getState();
    expect(token).toBeNull();
    expect(username).toBeNull();
  });
});
