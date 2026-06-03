import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ToastProvider } from '../components/Toast';
import { useDayActions } from '../hooks/useDayActions';

vi.mock('../api', () => ({
  default: { delete: vi.fn(), patch: vi.fn(), post: vi.fn() },
}));

import api from '../api';

const wrapper = ({ children }) => React.createElement(ToastProvider, null, children);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useDayActions error surfacing', () => {
  it('shows an error toast when deleteWeight fails', async () => {
    api.delete.mockRejectedValueOnce(new Error('500'));

    const { result } = renderHook(
      () => useDayActions({
        date: '2026-06-02',
        weightEntry: { id: 1 },
        onRefetchW: vi.fn(),
        onRefetchN: vi.fn(),
        onRefetchWo: vi.fn(),
        onRefetchS: vi.fn(),
      }),
      { wrapper }
    );

    await act(async () => { await result.current.deleteWeight(); });

    expect(document.querySelector('[role="status"]')?.textContent)
      .toMatch(/weight/i);
  });

  it('shows an error toast when deleteWorkoutSession fails', async () => {
    api.delete.mockRejectedValueOnce(new Error('500'));

    const { result } = renderHook(
      () => useDayActions({
        date: '2026-06-02',
        workoutEntry: { id: 7 },
        onRefetchW: vi.fn(),
        onRefetchN: vi.fn(),
        onRefetchWo: vi.fn(),
        onRefetchS: vi.fn(),
      }),
      { wrapper }
    );

    await act(async () => { await result.current.deleteWorkoutSession(); });

    expect(document.querySelector('[role="status"]')?.textContent)
      .toMatch(/workout/i);
  });

  it('does not show a toast on success', async () => {
    api.delete.mockResolvedValueOnce({});

    const { result } = renderHook(
      () => useDayActions({
        date: '2026-06-02',
        weightEntry: { id: 1 },
        onRefetchW: vi.fn(),
        onRefetchN: vi.fn(),
        onRefetchWo: vi.fn(),
        onRefetchS: vi.fn(),
      }),
      { wrapper }
    );

    await act(async () => { await result.current.deleteWeight(); });

    expect(document.querySelector('[role="status"]')).toBeNull();
  });
});
