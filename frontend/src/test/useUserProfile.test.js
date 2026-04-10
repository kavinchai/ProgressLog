import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import useUserProfile from '../hooks/useUserProfile';

vi.mock('../api', () => ({
  default: { get: vi.fn(), put: vi.fn() },
}));

import api from '../api';

const DEFAULT_GOALS = {
  calorieTargetTraining: 2600,
  calorieTargetRest: 2000,
  proteinTarget: 180,
};

const CUSTOM_GOALS = {
  calorieTargetTraining: 3000,
  calorieTargetRest: 2200,
  proteinTarget: 200,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useUserProfile', () => {
  it('starts in loading state', () => {
    api.get.mockResolvedValue({ data: CUSTOM_GOALS });
    const { result } = renderHook(() => useUserProfile());
    expect(result.current.loading).toBe(true);
  });

  it('loads goals from the API', async () => {
    api.get.mockResolvedValue({ data: CUSTOM_GOALS });
    const { result } = renderHook(() => useUserProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.goals).toEqual(CUSTOM_GOALS);
  });

  it('keeps default goals silently when API fails', async () => {
    api.get.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useUserProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.goals).toEqual(DEFAULT_GOALS);
    expect(result.current.error).toBeNull();
  });

  it('saveGoals calls PUT and updates goals on success', async () => {
    api.get.mockResolvedValue({ data: CUSTOM_GOALS });
    api.put.mockResolvedValue({ data: { ...CUSTOM_GOALS, proteinTarget: 220 } });

    const { result } = renderHook(() => useUserProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.saveGoals({ ...CUSTOM_GOALS, proteinTarget: 220 });
    });

    expect(api.put).toHaveBeenCalledWith('/profile/goals', { ...CUSTOM_GOALS, proteinTarget: 220 });
    expect(result.current.goals.proteinTarget).toBe(220);
    expect(result.current.error).toBeNull();
  });

  it('saveGoals sets error and re-throws on failure', async () => {
    api.get.mockResolvedValue({ data: CUSTOM_GOALS });
    api.put.mockRejectedValue({ response: { data: { message: 'Validation failed' } } });

    const { result } = renderHook(() => useUserProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let threw = false;
    await act(async () => {
      try { await result.current.saveGoals(CUSTOM_GOALS); }
      catch { threw = true; }
    });

    expect(threw).toBe(true);
    await waitFor(() => expect(result.current.error).toBe('Validation failed'));
    expect(result.current.saving).toBe(false);
  });

  it('saveGoals uses fallback error message when response has no message', async () => {
    api.get.mockResolvedValue({ data: CUSTOM_GOALS });
    api.put.mockRejectedValue({});

    const { result } = renderHook(() => useUserProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let threw = false;
    await act(async () => {
      try { await result.current.saveGoals(CUSTOM_GOALS); }
      catch { threw = true; }
    });

    expect(threw).toBe(true);
    await waitFor(() => expect(result.current.error).toBe('Failed to save goals'));
  });

  it('saving flag is true while PUT is in flight', async () => {
    api.get.mockResolvedValue({ data: CUSTOM_GOALS });

    let resolvePut;
    api.put.mockReturnValue(new Promise(res => { resolvePut = res; }));

    const { result } = renderHook(() => useUserProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => { result.current.saveGoals(CUSTOM_GOALS); });
    expect(result.current.saving).toBe(true);

    await act(async () => { resolvePut({ data: CUSTOM_GOALS }); });
    expect(result.current.saving).toBe(false);
  });
});
