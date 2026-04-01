export function groupByExercise(exerciseSets) {
  const map = {};
  for (const s of (exerciseSets ?? [])) {
    const key = `${s.exerciseName}__${s.weightLbs}`;
    if (!map[key]) map[key] = { name: s.exerciseName, weight: parseFloat(s.weightLbs), sets: [] };
    map[key].sets.push(s);
  }
  return Object.values(map)
    .sort((a, b) => a.name.localeCompare(b.name) || b.weight - a.weight)
    .map(g => ({ ...g, sets: g.sets.sort((a, b) => a.setNumber - b.setNumber) }));
}
