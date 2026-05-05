import { describe, expect, it } from 'vitest';
import { buildDayRows } from '../utils/stats';

describe('buildDayRows — data availability', () => {
  it('returns null calories/protein for days with no nutrition entry', () => {
    const rows = buildDayRows(['2026-05-01'], [], [], [], []);
    expect(rows[0].calories).toBeNull();
    expect(rows[0].protein).toBeNull();
  });

  it('returns null calories/protein when nutrition entry exists but has no meals', () => {
    // Backend returns totalCalories=0, totalProtein=0 for empty nutrition logs.
    // These should not contaminate averages — treat as "data not available".
    const nutrition = [
      {
        id: 1,
        logDate: '2026-05-01',
        dayType: 'rest',
        totalCalories: 0,
        totalProtein: 0,
        meals: [],
      },
    ];
    const rows = buildDayRows(['2026-05-01'], [], nutrition, [], []);
    expect(rows[0].calories).toBeNull();
    expect(rows[0].protein).toBeNull();
  });

  it('preserves calories/protein when meals are logged', () => {
    const nutrition = [
      {
        id: 1,
        logDate: '2026-05-01',
        dayType: 'training',
        totalCalories: 2400,
        totalProtein: 180,
        meals: [{ id: 11, mealName: 'eggs', calories: 2400, proteinGrams: 180 }],
      },
    ];
    const rows = buildDayRows(['2026-05-01'], [], nutrition, [], []);
    expect(rows[0].calories).toBe(2400);
    expect(rows[0].protein).toBe(180);
  });

  it('returns null weight when no weight entry exists for a date', () => {
    const rows = buildDayRows(['2026-05-01'], [], [], [], []);
    expect(rows[0].weight).toBeNull();
  });

  it('returns null steps when no step entry exists for a date', () => {
    const rows = buildDayRows(['2026-05-01'], [], [], [], []);
    expect(rows[0].steps).toBeNull();
  });

  it('returns null workout when no workout exists for a date', () => {
    const rows = buildDayRows(['2026-05-01'], [], [], [], []);
    expect(rows[0].workout).toBeNull();
  });

  it('mixes available and unavailable days correctly across a week', () => {
    const dates = [
      '2026-05-01',
      '2026-05-02',
      '2026-05-03',
    ];
    const weight = [{ id: 1, logDate: '2026-05-01', weightLbs: 200 }];
    const nutrition = [
      // day 1: has meals
      {
        id: 11,
        logDate: '2026-05-01',
        totalCalories: 2000,
        totalProtein: 150,
        meals: [{ id: 100, mealName: 'a', calories: 2000, proteinGrams: 150 }],
      },
      // day 2: empty entry (no meals)
      {
        id: 12,
        logDate: '2026-05-02',
        totalCalories: 0,
        totalProtein: 0,
        meals: [],
      },
      // day 3: no entry at all
    ];
    const rows = buildDayRows(dates, weight, nutrition, [], []);

    expect(rows[0].calories).toBe(2000);
    expect(rows[0].protein).toBe(150);
    expect(rows[1].calories).toBeNull();
    expect(rows[1].protein).toBeNull();
    expect(rows[2].calories).toBeNull();
    expect(rows[2].protein).toBeNull();
  });
});
