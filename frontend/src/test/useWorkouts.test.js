import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import useWorkouts from '../hooks/useWorkouts';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
  },
}));

import api from '../api';

const SESSIONS = [
  { id: 1, sessionDate: '2026-01-01', exerciseSets: [] },
  { id: 2, sessionDate: '2026-01-08', exerciseSets: [] },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useWorkouts', () => {
  it('returns data on success', async () => {
    api.get.mockResolvedValue({ data: SESSIONS });

    const { result } = renderHook(() => useWorkouts());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual(SESSIONS);
    expect(result.current.error).toBeNull();
  });

  it('starts in loading state', () => {
    api.get.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useWorkouts());
    expect(result.current.loading).toBe(true);
  });

  it('sets error on failure', async () => {
    api.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useWorkouts());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.data).toEqual([]);
  });

  it('refetch re-calls the api', async () => {
    api.get.mockResolvedValue({ data: SESSIONS });

    const { result } = renderHook(() => useWorkouts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    result.current.refetch();
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });
});
