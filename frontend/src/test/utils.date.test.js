import { describe, expect, it } from 'vitest';
import {
  localDateStr,
  formatDate,
  formatDateShort,
  formatDateFull,
  shortDate,
  avg,
} from '../utils/date';

describe('localDateStr', () => {
  it('formats a date object as YYYY-MM-DD', () => {
    expect(localDateStr(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('zero-pads month and day', () => {
    expect(localDateStr(new Date(2024, 8, 3))).toBe('2024-09-03');
  });

  it('handles end-of-year dates', () => {
    expect(localDateStr(new Date(2025, 11, 31))).toBe('2025-12-31');
  });
});

describe('formatDate', () => {
  it('converts YYYY-MM-DD to M/D', () => {
    expect(formatDate('2026-01-05')).toBe('1/5');
  });

  it('strips leading zeros from month and day', () => {
    expect(formatDate('2026-03-09')).toBe('3/9');
  });

  it('returns empty string for falsy input', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
  });
});

describe('formatDateShort', () => {
  it('converts YYYY-MM-DD to M/D/YY', () => {
    expect(formatDateShort('2026-01-05')).toBe('1/5/26');
  });

  it('uses two-digit year', () => {
    expect(formatDateShort('2000-12-31')).toBe('12/31/00');
  });
});

describe('formatDateFull', () => {
  it('converts YYYY-MM-DD to M/D/YYYY', () => {
    expect(formatDateFull('2026-01-05')).toBe('1/5/2026');
  });

  it('keeps four-digit year', () => {
    expect(formatDateFull('2000-12-31')).toBe('12/31/2000');
  });
});

describe('shortDate', () => {
  it('returns a day-of-week prefix with M/D', () => {
    // 2026-01-05 is a Monday
    expect(shortDate('2026-01-05')).toBe('Mon 1/5');
  });

  it('works for a Sunday', () => {
    // 2026-01-04 is a Sunday
    expect(shortDate('2026-01-04')).toBe('Sun 1/4');
  });

  it('works for a Saturday', () => {
    // 2026-01-03 is a Saturday
    expect(shortDate('2026-01-03')).toBe('Sat 1/3');
  });
});

describe('avg', () => {
  it('returns average of numbers as toFixed(1) string', () => {
    expect(avg([1, 2, 3])).toBe('2.0');
  });

  it('filters out null values', () => {
    expect(avg([null, 2, null, 4])).toBe('3.0');
  });

  it('returns null when all values are null', () => {
    expect(avg([null, null])).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(avg([])).toBeNull();
  });

  it('rounds to one decimal place', () => {
    expect(avg([1, 2])).toBe('1.5');
    expect(avg([1, 1, 2])).toBe('1.3');
  });
});
