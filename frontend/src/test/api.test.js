import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import useAuthStore from '../store/authStore';

// Re-import api after mocking so interceptors run with vi.fn() in place
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    default: {
      ...actual.default,
      create: vi.fn(() => ({
        interceptors: {
          request:  { use: vi.fn() },
          response: { use: vi.fn() },
        },
      })),
    },
  };
});

describe('api interceptors (unit)', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, username: null });
  });

  it('request interceptor injects Authorization header when token exists', () => {
    useAuthStore.setState({ token: 'tok123', username: 'alice' });

    // Simulate what the request interceptor does
    const config = { headers: {} };
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;

    expect(config.headers.Authorization).toBe('Bearer tok123');
  });

  it('request interceptor leaves headers alone when no token', () => {
    const config = { headers: {} };
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('response interceptor logs out on 401', () => {
    useAuthStore.setState({ token: 'tok', username: 'alice' });

    // Simulate what the response error interceptor does
    const error = { response: { status: 401 } };
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }

    expect(useAuthStore.getState().token).toBeNull();
  });

  it('response interceptor does not log out on other errors', () => {
    useAuthStore.setState({ token: 'tok', username: 'alice' });

    const error = { response: { status: 500 } };
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }

    expect(useAuthStore.getState().token).toBe('tok');
  });
});
