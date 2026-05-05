import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  localDateStr,
  formatDate,
  formatDateShort,
  formatDateFull,
  shortDate,
  avg,
  getCurrentWeek,
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

describe('getCurrentWeek', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 7 dates', () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 4, 6, 12, 0, 0) }); // Wed May 6
    expect(getCurrentWeek()).toHaveLength(7);
  });

  it('starts on Sunday and ends on Saturday', () => {
    // 2026-05-06 is a Wednesday → week is 2026-05-03 (Sun) to 2026-05-09 (Sat)
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 4, 6, 12, 0, 0) });
    const week = getCurrentWeek();
    expect(week[0]).toBe('2026-05-03');
    expect(week[6]).toBe('2026-05-09');
  });

  it('returns dates in calendar order (Sun first, Sat last)', () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 4, 6, 12, 0, 0) });
    const week = getCurrentWeek();
    expect(week).toEqual([
      '2026-05-03',
      '2026-05-04',
      '2026-05-05',
      '2026-05-06',
      '2026-05-07',
      '2026-05-08',
      '2026-05-09',
    ]);
  });

  it('returns the same week when called from any day in that week', () => {
    // From Sunday
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 4, 3, 12, 0, 0) });
    const fromSun = getCurrentWeek();
    vi.useRealTimers();
    // From Saturday
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 4, 9, 12, 0, 0) });
    const fromSat = getCurrentWeek();
    expect(fromSun).toEqual(fromSat);
    expect(fromSun[0]).toBe('2026-05-03');
    expect(fromSun[6]).toBe('2026-05-09');
  });

  it('handles month rollover correctly', () => {
    // 2026-05-01 is a Friday → week is 2026-04-26 (Sun) to 2026-05-02 (Sat)
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 4, 1, 12, 0, 0) });
    const week = getCurrentWeek();
    expect(week[0]).toBe('2026-04-26');
    expect(week[6]).toBe('2026-05-02');
  });

  it('handles year rollover correctly', () => {
    // 2025-12-31 is a Wednesday → week is 2025-12-28 (Sun) to 2026-01-03 (Sat)
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2025, 11, 31, 12, 0, 0) });
    const week = getCurrentWeek();
    expect(week[0]).toBe('2025-12-28');
    expect(week[6]).toBe('2026-01-03');
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
