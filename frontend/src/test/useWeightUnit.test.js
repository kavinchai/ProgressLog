import { describe, it, expect } from 'vitest';
import { toDisplay, fromDisplay } from '../hooks/useWeightUnit';

describe('toDisplay', () => {
  it('returns lbs unchanged when unit is lbs', () => {
    expect(toDisplay(185, 'lbs')).toBe(185);
  });

  it('converts lbs to kg rounded to 2 decimals', () => {
    expect(toDisplay(185, 'kg')).toBe(83.91);
  });

  it('returns null for null input', () => {
    expect(toDisplay(null, 'kg')).toBeNull();
    expect(toDisplay(null, 'lbs')).toBeNull();
  });

  it('converts 0 correctly', () => {
    expect(toDisplay(0, 'kg')).toBe(0);
  });
});

describe('fromDisplay', () => {
  it('returns value unchanged when unit is lbs', () => {
    expect(fromDisplay('185', 'lbs')).toBe(185);
  });

  it('converts kg to lbs rounded to 1 decimal', () => {
    expect(fromDisplay('83.91', 'kg')).toBe(185);
  });

  it('returns NaN for non-numeric input', () => {
    expect(fromDisplay('', 'lbs')).toBeNaN();
    expect(fromDisplay('abc', 'kg')).toBeNaN();
  });

  it('round-trips correctly: toDisplay then fromDisplay', () => {
    const original = 225;
    const displayed = toDisplay(original, 'kg');
    const back = fromDisplay(String(displayed), 'kg');
    // within 0.5 lbs due to rounding
    expect(Math.abs(back - original)).toBeLessThan(0.5);
  });
});
