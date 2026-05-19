import { describe, expect, it } from 'vitest';
import {
  getMuscleGroups,
  getExerciseMuscles,
  buildMuscleGroupStats,
  getHeatLevel,
  getGroupForSlug,
  buildBodyData,
  buildBodyState,
} from '../utils/muscleMapping';

describe('getMuscleGroups', () => {
  it('returns all defined muscle groups', () => {
    const groups = getMuscleGroups();
    expect(groups).toContain('chest');
    expect(groups).toContain('back');
    expect(groups).toContain('quads');
    expect(groups).toContain('core');
    expect(groups.length).toBeGreaterThan(0);
  });
});

describe('getExerciseMuscles', () => {
  it('returns muscle groups for a known exercise (exact match)', () => {
    const muscles = getExerciseMuscles('Bench Press');
    expect(muscles).toContain('chest');
    expect(muscles).toContain('triceps');
  });

  it('is case-insensitive', () => {
    expect(getExerciseMuscles('BENCH PRESS')).toEqual(getExerciseMuscles('bench press'));
    expect(getExerciseMuscles('Squat')).toEqual(getExerciseMuscles('squat'));
  });

  it('returns empty array for unknown exercises', () => {
    expect(getExerciseMuscles('Underwater Basket Weaving')).toEqual([]);
  });

  it('returns empty array for null/undefined input', () => {
    expect(getExerciseMuscles(null)).toEqual([]);
    expect(getExerciseMuscles(undefined)).toEqual([]);
  });

  it('handles exercises with multiple muscle groups', () => {
    const muscles = getExerciseMuscles('Deadlift');
    expect(muscles).toContain('back');
    expect(muscles).toContain('hamstrings');
    expect(muscles).toContain('glutes');
  });
});

describe('buildMuscleGroupStats', () => {
  it('returns empty map when no workout data', () => {
    const stats = buildMuscleGroupStats([]);
    const groups = Object.keys(stats);
    groups.forEach(g => {
      expect(stats[g].count).toBe(0);
      expect(stats[g].exercises).toEqual([]);
    });
  });

  it('returns empty map for null input', () => {
    const stats = buildMuscleGroupStats(null);
    expect(stats).toBeDefined();
  });

  it('counts muscle group hits from exercise sets', () => {
    const workoutData = [
      {
        id: 1,
        sessionDate: '2026-05-05',
        exerciseSets: [
          { exerciseName: 'Bench Press', weightLbs: '135', reps: 8, setNumber: 1 },
          { exerciseName: 'Bench Press', weightLbs: '135', reps: 8, setNumber: 2 },
        ],
      },
    ];
    const stats = buildMuscleGroupStats(workoutData);
    expect(stats.chest.count).toBe(1);
    expect(stats.triceps.count).toBe(1);
    expect(stats.shoulders.count).toBe(1);
    expect(stats.back.count).toBe(0);
  });

  it('counts unique exercises per muscle group, not sets', () => {
    const workoutData = [
      {
        id: 1,
        sessionDate: '2026-05-05',
        exerciseSets: [
          { exerciseName: 'Bench Press', weightLbs: '135', reps: 8, setNumber: 1 },
          { exerciseName: 'Bench Press', weightLbs: '135', reps: 8, setNumber: 2 },
          { exerciseName: 'Bench Press', weightLbs: '155', reps: 5, setNumber: 3 },
        ],
      },
    ];
    const stats = buildMuscleGroupStats(workoutData);
    expect(stats.chest.count).toBe(1);
  });

  it('counts multiple different exercises targeting the same muscle group', () => {
    const workoutData = [
      {
        id: 1,
        sessionDate: '2026-05-05',
        exerciseSets: [
          { exerciseName: 'Bench Press', weightLbs: '135', reps: 8, setNumber: 1 },
          { exerciseName: 'Dumbbell Fly', weightLbs: '30', reps: 12, setNumber: 1 },
        ],
      },
    ];
    const stats = buildMuscleGroupStats(workoutData);
    expect(stats.chest.count).toBe(2);
  });

  it('tracks exercise details for each muscle group', () => {
    const workoutData = [
      {
        id: 1,
        sessionDate: '2026-05-05',
        exerciseSets: [
          { exerciseName: 'Squat', weightLbs: '225', reps: 5, setNumber: 1 },
          { exerciseName: 'Squat', weightLbs: '225', reps: 5, setNumber: 2 },
        ],
      },
    ];
    const stats = buildMuscleGroupStats(workoutData);
    expect(stats.quads.exercises).toHaveLength(1);
    expect(stats.quads.exercises[0].name).toBe('Squat');
    expect(stats.quads.exercises[0].sets).toHaveLength(2);
  });

  it('aggregates across multiple sessions', () => {
    const workoutData = [
      {
        id: 1,
        sessionDate: '2026-05-05',
        exerciseSets: [
          { exerciseName: 'Bench Press', weightLbs: '135', reps: 8, setNumber: 1 },
        ],
      },
      {
        id: 2,
        sessionDate: '2026-05-07',
        exerciseSets: [
          { exerciseName: 'Incline Bench Press', weightLbs: '115', reps: 10, setNumber: 1 },
        ],
      },
    ];
    const stats = buildMuscleGroupStats(workoutData);
    expect(stats.chest.count).toBe(2);
    expect(stats.chest.exercises).toHaveLength(2);
  });

  it('ignores exercises not in the mapping', () => {
    const workoutData = [
      {
        id: 1,
        sessionDate: '2026-05-05',
        exerciseSets: [
          { exerciseName: 'Mystery Exercise', weightLbs: '100', reps: 10, setNumber: 1 },
        ],
      },
    ];
    const stats = buildMuscleGroupStats(workoutData);
    Object.values(stats).forEach(s => {
      expect(s.count).toBe(0);
    });
  });
});

describe('getHeatLevel', () => {
  it('returns "none" for 0 exercises', () => {
    expect(getHeatLevel(0)).toBe('none');
  });

  it('returns "low" for 1-2 exercises', () => {
    expect(getHeatLevel(1)).toBe('low');
    expect(getHeatLevel(2)).toBe('low');
  });

  it('returns "high" for 3+ exercises', () => {
    expect(getHeatLevel(3)).toBe('high');
    expect(getHeatLevel(5)).toBe('high');
    expect(getHeatLevel(10)).toBe('high');
  });
});

describe('getGroupForSlug', () => {
  it('maps library slugs to our muscle groups', () => {
    expect(getGroupForSlug('chest')).toBe('chest');
    expect(getGroupForSlug('biceps')).toBe('biceps');
    expect(getGroupForSlug('quadriceps')).toBe('quads');
    expect(getGroupForSlug('gluteal')).toBe('glutes');
    expect(getGroupForSlug('upper-back')).toBe('back');
    expect(getGroupForSlug('deltoids')).toBe('shoulders');
    expect(getGroupForSlug('abs')).toBe('core');
  });

  it('returns null for unmapped slugs', () => {
    expect(getGroupForSlug('head')).toBeNull();
    expect(getGroupForSlug('feet')).toBeNull();
    expect(getGroupForSlug('unknown-muscle')).toBeNull();
  });
});

describe('buildBodyData', () => {
  const emptyStats = Object.fromEntries(
    getMuscleGroups().map(g => [g, { count: 0, exercises: [] }])
  );

  it('returns empty array for untrained muscles', () => {
    const data = buildBodyData(emptyStats, null);
    expect(data).toEqual([]);
  });

  it('returns low opacity color for 1-2 exercise count', () => {
    const stats = { ...emptyStats, chest: { count: 2, exercises: [] } };
    const data = buildBodyData(stats, null);
    const chestEntry = data.find(d => d.slug === 'chest');
    expect(chestEntry).toBeDefined();
    expect(chestEntry.color).toBe('rgba(255, 107, 53, 0.35)');
  });

  it('returns high opacity color for 3+ exercise count', () => {
    const stats = { ...emptyStats, chest: { count: 4, exercises: [] } };
    const data = buildBodyData(stats, null);
    const chestEntry = data.find(d => d.slug === 'chest');
    expect(chestEntry).toBeDefined();
    expect(chestEntry.color).toBe('rgba(255, 107, 53, 0.9)');
  });

  it('adds stroke styles for the selected muscle group', () => {
    const stats = { ...emptyStats, chest: { count: 1, exercises: [] } };
    const data = buildBodyData(stats, 'chest');
    const chestEntry = data.find(d => d.slug === 'chest');
    expect(chestEntry.styles).toBeDefined();
    expect(chestEntry.styles.stroke).toBe('#ff6b35');
    expect(chestEntry.styles.strokeWidth).toBe(2);
  });

  it('does not add stroke styles for non-selected muscle groups', () => {
    const stats = { ...emptyStats, chest: { count: 1, exercises: [] }, biceps: { count: 1, exercises: [] } };
    const data = buildBodyData(stats, 'chest');
    const bicepsEntry = data.find(d => d.slug === 'biceps');
    expect(bicepsEntry.styles).toBeUndefined();
  });

  it('maps muscle groups to correct slugs', () => {
    const stats = { ...emptyStats, back: { count: 1, exercises: [] } };
    const data = buildBodyData(stats, null);
    const slugs = data.map(d => d.slug);
    expect(slugs).toContain('upper-back');
    expect(slugs).toContain('lower-back');
  });
});

describe('buildBodyState (legacy)', () => {
  const emptyStats = Object.fromEntries(
    getMuscleGroups().map(g => [g, { count: 0, exercises: [] }])
  );

  it('returns body state with intensity 0 for untrained muscles', () => {
    const state = buildBodyState(emptyStats, null);
    expect(state['chest'].intensity).toBe(0);
    expect(state['chest'].selected).toBe(false);
  });

  it('returns low intensity for 1-2 exercise count', () => {
    const stats = { ...emptyStats, chest: { count: 2, exercises: [] } };
    const state = buildBodyState(stats, null);
    expect(state['chest'].intensity).toBe(3);
  });

  it('returns high intensity for 3+ exercise count', () => {
    const stats = { ...emptyStats, chest: { count: 4, exercises: [] } };
    const state = buildBodyState(stats, null);
    expect(state['chest'].intensity).toBe(8);
  });

  it('marks selected muscle group slugs as selected', () => {
    const state = buildBodyState(emptyStats, 'chest');
    expect(state['chest'].selected).toBe(true);
    expect(state['biceps'].selected).toBe(false);
  });
});
