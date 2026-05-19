import muscleGroupData from '../data/muscleGroups.json';

const { muscleGroups, exerciseMap } = muscleGroupData;

const normalizedMap = Object.fromEntries(
  Object.entries(exerciseMap).map(([k, v]) => [k.toLowerCase(), v])
);

// Maps our muscle group names to the body-muscles library's individual muscle IDs
const GROUP_TO_MUSCLE_IDS = {
  chest: [
    'chest-upper-left', 'chest-upper-right',
    'chest-lower-left', 'chest-lower-right',
  ],
  back: [
    'lats-upper-left', 'lats-mid-left', 'lats-lower-left',
    'lats-upper-right', 'lats-mid-right', 'lats-lower-right',
    'lower-back-erectors-left', 'lower-back-ql-left',
    'lower-back-erectors-right', 'lower-back-ql-right',
    'spine',
  ],
  shoulders: [
    'shoulder-front-left', 'shoulder-front-right',
    'shoulder-side-left', 'shoulder-side-right',
    'deltoid-rear-left', 'deltoid-rear-right',
    'traps-upper-left', 'traps-upper-right',
    'traps-mid-left', 'traps-mid-right',
    'traps-lower-left', 'traps-lower-right',
  ],
  biceps: ['biceps-left', 'biceps-right'],
  triceps: [
    'triceps-long-left', 'triceps-lateral-left',
    'triceps-long-right', 'triceps-lateral-right',
  ],
  forearms: [
    'forearm-left', 'forearm-right',
    'forearm-flexors-left', 'forearm-extensors-left',
    'forearm-flexors-right', 'forearm-extensors-right',
  ],
  core: [
    'abs-upper-left', 'abs-upper-right',
    'abs-lower-left', 'abs-lower-right',
    'serratus-anterior-left', 'serratus-anterior-right',
    'obliques-left', 'obliques-right',
  ],
  quads: [
    'quads-left', 'quads-right',
    'hip-flexor-left', 'hip-flexor-right',
    'adductors-left', 'adductors-right',
  ],
  hamstrings: [
    'hamstrings-medial-left', 'hamstrings-lateral-left',
    'hamstrings-medial-right', 'hamstrings-lateral-right',
  ],
  glutes: [
    'gluteus-medius-left', 'gluteus-maximus-left',
    'gluteus-medius-right', 'gluteus-maximus-right',
  ],
  calves: [
    'calves-gastroc-medial-left', 'calves-gastroc-lateral-left', 'calves-soleus-left',
    'calves-gastroc-medial-right', 'calves-gastroc-lateral-right', 'calves-soleus-right',
  ],
};

// Reverse map: library muscle ID → our group name
const MUSCLE_ID_TO_GROUP = {};
for (const [group, ids] of Object.entries(GROUP_TO_MUSCLE_IDS)) {
  for (const id of ids) {
    MUSCLE_ID_TO_GROUP[id] = group;
  }
}

export function getMuscleGroups() {
  return muscleGroups;
}

export function getExerciseMuscles(exerciseName) {
  if (!exerciseName) return [];
  return normalizedMap[exerciseName.toLowerCase()] ?? [];
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

export function getGroupForMuscleId(muscleId) {
  return MUSCLE_ID_TO_GROUP[muscleId] ?? null;
}

export function buildBodyState(muscleStats, selectedMuscle) {
  const state = {};
  for (const [group, data] of Object.entries(muscleStats)) {
    const ids = GROUP_TO_MUSCLE_IDS[group];
    if (!ids) continue;

    let intensity = 0;
    if (data.count >= 3) intensity = 8;
    else if (data.count >= 1) intensity = 3;

    const isSelected = selectedMuscle === group;

    for (const id of ids) {
      state[id] = { intensity, selected: isSelected };
    }
  }
  return state;
}
