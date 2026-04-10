import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useTheme from '../hooks/useTheme';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

afterEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

describe('useTheme', () => {
  it('defaults to light mode when localStorage has no theme', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe(false);
  });

  it('starts in dark mode when localStorage has "dark"', () => {
    localStorage.setItem('theme', 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe(true);
  });

  it('starts in light mode when localStorage has "light"', () => {
    localStorage.setItem('theme', 'light');
    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe(false);
  });

  it('toggling to dark adds "dark" class to documentElement', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current[1](true));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggling to light removes "dark" class from documentElement', () => {
    localStorage.setItem('theme', 'dark');
    const { result } = renderHook(() => useTheme());
    act(() => result.current[1](false));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('persists dark preference to localStorage', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current[1](true));
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('persists light preference to localStorage', () => {
    localStorage.setItem('theme', 'dark');
    const { result } = renderHook(() => useTheme());
    act(() => result.current[1](false));
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
