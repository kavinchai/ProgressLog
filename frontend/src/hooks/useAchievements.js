import { useMemo } from "react";
import useWorkouts from "./useWorkouts";
import useNutrition from "./useNutrition";
import useSteps from "./useSteps";
import useUserProfile from "./useUserProfile";
import { computeAchievements } from "../utils/achievements";

/** Achievements from the workouts, meals and steps already loaded. */
export default function useAchievements() {
	const { data: workouts, loading: loadingWorkouts } = useWorkouts();
	const { data: nutrition, loading: loadingNutrition } = useNutrition();
	const { data: steps, loading: loadingSteps } = useSteps();
	const { goals } = useUserProfile();
	const achievements = useMemo(
		() =>
			computeAchievements({
				workouts,
				nutrition,
				steps,
				proteinGoal: goals.proteinTarget,
			}),
		[workouts, nutrition, steps, goals.proteinTarget],
	);
	return {
		...achievements,
		loading: loadingWorkouts || loadingNutrition || loadingSteps,
	};
}
