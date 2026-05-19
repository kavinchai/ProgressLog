import muscleGroupData from '../data/muscleGroups.json';

const { muscleGroups, exerciseMap } = muscleGroupData;

const normalizedMap = Object.fromEntries(
  Object.entries(exerciseMap).map(([k, v]) => [k.toLowerCase(), v])
);

// Maps our muscle group names to react-muscle-highlighter slug names
const GROUP_TO_SLUGS = {
  chest: ['chest'],
  back: ['upper-back', 'lower-back'],
  shoulders: ['deltoids', 'trapezius'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearms: ['forearm'],
  core: ['abs', 'obliques'],
  quads: ['quadriceps', 'adductors', 'knees'],
  hamstrings: ['hamstring'],
  glutes: ['gluteal'],
  calves: ['calves', 'tibialis'],
};

// Reverse map: slug → our group name
const SLUG_TO_GROUP = {};
for (const [group, slugs] of Object.entries(GROUP_TO_SLUGS)) {
  for (const slug of slugs) {
    SLUG_TO_GROUP[slug] = group;
  }
}

export function getMuscleGroups() {
  return muscleGroups;
}

export function getExerciseMuscles(exerciseName) {
  if (!exerciseName) return [];
  const key = exerciseName.toLowerCase().trim();
  return normalizedMap[key]
    ?? normalizedMap[key.replace(/s$/, '')]
    ?? [];
}

export function buildMuscleGroupStats(workoutData) {
  const stats = Object.fromEntries(
    muscleGroups.map(g => [g, { count: 0, exercises: [] }])
  );

  if (!workoutData) return stats;

  for (const session of workoutData) {
    const sets = session.exerciseSets ?? [];
    const exerciseNames = [...new Set(sets.map(s => s.exerciseName))];

    for (const name of exerciseNames) {
      const muscles = getExerciseMuscles(name);
      const exerciseSets = sets.filter(s => s.exerciseName === name);

      for (const muscle of muscles) {
        if (stats[muscle]) {
          stats[muscle].count += 1;
          stats[muscle].exercises.push({
            name,
            sets: exerciseSets,
          });
        }
      }
    }
  }

  return stats;
}

export function getHeatLevel(count) {
  if (count === 0) return 'none';
  if (count <= 2) return 'low';
  return 'high';
}

export function getGroupForSlug(slug) {
  return SLUG_TO_GROUP[slug] ?? null;
}

// Kept for backward compatibility with tests referencing the old name
export const getGroupForMuscleId = getGroupForSlug;

export function buildBodyData(muscleStats, selectedMuscle) {
  const data = [];
  for (const [group, stats] of Object.entries(muscleStats)) {
    const slugs = GROUP_TO_SLUGS[group];
    if (!slugs || stats.count === 0) continue;

    const color = stats.count >= 3
      ? 'rgba(255, 107, 53, 0.9)'   // high intensity — solid orange
      : 'rgba(255, 107, 53, 0.35)'; // low intensity — light orange

    const isSelected = selectedMuscle === group;

    for (const slug of slugs) {
      const entry = { slug, color };
      if (isSelected) {
        entry.styles = {
          stroke: '#ff6b35',
          strokeWidth: 2,
        };
      }
      data.push(entry);
    }
  }
  return data;
}

// Legacy export kept for backward compatibility with tests
export function buildBodyState(muscleStats, selectedMuscle) {
  const state = {};
  for (const [group, data] of Object.entries(muscleStats)) {
    const slugs = GROUP_TO_SLUGS[group];
    if (!slugs) continue;

    let intensity = 0;
    if (data.count >= 3) intensity = 8;
    else if (data.count >= 1) intensity = 3;

    const isSelected = selectedMuscle === group;

    for (const slug of slugs) {
      state[slug] = { intensity, selected: isSelected };
    }
  }
  return state;
}
