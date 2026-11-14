// Turns daily Apple Health readings into the step and weight saves the app
// still needs, so a sync only writes days that are new or changed.

const round1 = (n) => Math.round(n * 10) / 10;

export function planHealthWrites({
	healthSteps,
	healthWeights,
	existingSteps,
	existingWeights,
}) {
	const stepsByDate = new Map(existingSteps.map((s) => [s.logDate, s.steps]));
	const weightByDate = new Map(
		existingWeights.map((w) => [w.logDate, round1(Number(w.weightLbs))]),
	);

	const steps = healthSteps
		// A zero-step day usually means the phone wasn't carried, so it never
		// replaces steps the user entered.
		.filter((d) => d.steps > 0 && stepsByDate.get(d.date) !== d.steps)
		.map((d) => ({ logDate: d.date, steps: d.steps }));

	const weights = healthWeights
		.map((d) => ({ logDate: d.date, weightLbs: round1(d.pounds) }))
		.filter((w) => weightByDate.get(w.logDate) !== w.weightLbs);

	return { steps, weights };
}
