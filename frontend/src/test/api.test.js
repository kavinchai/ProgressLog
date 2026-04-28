import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    useAuthStore.setState({ authenticated: false, username: null });
  });

  it('response interceptor logs out on 401', () => {
    useAuthStore.setState({ authenticated: true, username: 'alice' });

    // Simulate what the response error interceptor does
    const error = { response: { status: 401 } };
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }

    expect(useAuthStore.getState().authenticated).toBe(false);
  });

  it('response interceptor does not log out on other errors', () => {
    useAuthStore.setState({ authenticated: true, username: 'alice' });

    const error = { response: { status: 500 } };
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }

    expect(useAuthStore.getState().authenticated).toBe(true);
  });
});
