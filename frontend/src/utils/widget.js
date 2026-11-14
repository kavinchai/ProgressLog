// Today's calories, protein and steps against their goals. Shared by the
// Today page's progress bar and the iOS home-screen widget so both always
// show the same numbers.

const DEFAULT_CALORIE_GOAL = 2000;
const DEFAULT_PROTEIN_GOAL = 150;
const DEFAULT_STEPS_GOAL = 10000;

export function todayTotals({ today, nutritionEntry, stepEntry, goals }) {
	const calorieGoal =
		nutritionEntry?.dayType === "rest"
			? goals.calorieTargetRest
			: goals.calorieTargetTraining;
	return {
		date: today,
		calories: nutritionEntry?.totalCalories ?? 0,
		calorieGoal: calorieGoal ?? DEFAULT_CALORIE_GOAL,
		protein: nutritionEntry?.totalProtein ?? 0,
		proteinGoal: goals.proteinTarget ?? DEFAULT_PROTEIN_GOAL,
		steps: stepEntry?.steps ?? 0,
		stepsGoal: goals.stepsTarget ?? DEFAULT_STEPS_GOAL,
	};
}
