// Builds a flat row for each date combining weight, nutrition, and workout data.
export function buildDayRows(dates, weightData, nutritionData, workoutData) {
  return dates.map(date => {
    const weightEntry    = weightData.find(x => x.logDate === date);
    const nutritionEntry = nutritionData.find(x => x.logDate === date);
    const workoutEntry   = workoutData.find(x => x.sessionDate === date);
    return {
      date,
      weightEntry, nutritionEntry, workoutEntry,
      weight:   weightEntry    ? parseFloat(weightEntry.weightLbs)       : null,
      calories: nutritionEntry ? (nutritionEntry.totalCalories ?? null)   : null,
      protein:  nutritionEntry ? (nutritionEntry.totalProtein  ?? null)   : null,
      workout:  workoutEntry
        ? (workoutEntry.sessionName
            ? workoutEntry.sessionName
            : workoutEntry.exerciseSets?.length > 0
              ? new Set(workoutEntry.exerciseSets.map(s => s.exerciseName)).size + ' exercises'
              : 'logged')
        : null,
    };
  });
}
