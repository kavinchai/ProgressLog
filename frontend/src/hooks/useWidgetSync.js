import { useEffect } from "react";
import useNutrition from "./useNutrition";
import useSteps from "./useSteps";
import useUserProfile from "./useUserProfile";
import useToday from "./useToday";
import { todayTotals } from "../utils/widget";
import { updateWidget } from "../native/widget";

// iOS widget: mirrors today's calories, protein and steps whichever page is
// open, so a meal logged or steps synced anywhere in the app reach it.
export default function useWidgetSync() {
	const today = useToday();
	const {
		data: nutritionData,
		loading: loadingNutrition,
		error: errorNutrition,
	} = useNutrition();
	const {
		data: stepData,
		loading: loadingSteps,
		error: errorSteps,
	} = useSteps();
	const { goals, loading: loadingProfile } = useUserProfile();

	const totals = todayTotals({
		today,
		nutritionEntry: nutritionData.find((n) => n.logDate === today),
		stepEntry: stepData.find((s) => s.logDate === today),
		goals,
	});

	// Only send once everything has loaded, and never zeros from a failed load.
	const ready =
		!loadingNutrition &&
		!loadingSteps &&
		!loadingProfile &&
		!errorNutrition &&
		!errorSteps;
	const totalsKey = JSON.stringify(totals);
	useEffect(() => {
		if (ready) updateWidget(JSON.parse(totalsKey));
	}, [ready, totalsKey]);
}
