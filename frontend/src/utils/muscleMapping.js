import muscleGroupData from '../data/muscleGroups.json';

const { muscleGroups, exerciseMap } = muscleGroupData;

const normalizedMap = Object.fromEntries(
  Object.entries(exerciseMap).map(([k, v]) => [k.toLowerCase(), v])
);

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
