/** Detect cardio from backend data — true if any set has distance or duration fields. */
export function hasCardioData(sets) {
  return (sets ?? []).some(s => s.distanceMiles != null || s.durationSeconds != null);
}

/** Classify exercise sets: 'run' (has distance), 'timed' (duration only), or 'lifting'. */
export function detectType(sets) {
  const arr = sets ?? [];
  if (arr.some(s => s.distanceMiles != null)) return 'run';
  if (arr.some(s => s.durationSeconds != null)) return 'timed';
  return 'lifting';
}

/** Format seconds into "Xm Ys" or "Xh Ym Zs". */
export function formatDuration(seconds) {
  if (seconds == null) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Calculate pace as "X:XX /mi" from distance (miles) and duration (seconds). */
export function calcPace(distanceMiles, durationSeconds) {
  if (!distanceMiles || !durationSeconds || distanceMiles <= 0) return null;
  const paceSeconds = durationSeconds / distanceMiles;
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.round(paceSeconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')} /mi`;
}

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
