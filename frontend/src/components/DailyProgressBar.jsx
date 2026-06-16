import "./DailyProgressBar.css";

export default function DailyProgressBar({
	caloriesCurrent,
	caloriesGoal,
	proteinCurrent,
	proteinGoal,
	stepsCurrent,
	stepsGoal,
}) {
	const getPercentage = (current, goal) => {
		if (goal <= 0) return 0;
		const pct = (current / goal) * 100;
		return Math.min(pct, 100);
	};

	const caloriesPercent = getPercentage(
		caloriesCurrent ?? 0,
		caloriesGoal ?? 1,
	);
	const proteinPercent = getPercentage(proteinCurrent ?? 0, proteinGoal ?? 1);
	const stepsPercent = getPercentage(stepsCurrent ?? 0, stepsGoal ?? 1);

	const caloriesExceeded = (caloriesCurrent ?? 0) > (caloriesGoal ?? 0);
	const proteinExceeded = (proteinCurrent ?? 0) > (proteinGoal ?? 0);
	const stepsExceeded = (stepsCurrent ?? 0) > (stepsGoal ?? 0);

	function ProgressItem({
		label,
		current,
		goal,
		percent,
		category,
		unit,
		exceeded,
	}) {
		return (
			<div className="daily-progress-item">
				<div className="daily-progress-header">
					<span className="daily-progress-label">{label}</span>
					<span className="daily-progress-value">
						{Math.round(current)}/{Math.round(goal)} {unit}
					</span>
				</div>
				<div
					className={`daily-progress-bar-container daily-progress-bar-container--${category}`}
				>
					<div
						className={`daily-progress-bar daily-progress-bar--${category}`}
						style={{ width: `${percent}%` }}
					/>
				</div>
				{exceeded && (
					<span className="daily-progress-exceeded">
						+{Math.round(current - goal)} over
					</span>
				)}
			</div>
		);
	}

	return (
		<div className="daily-progress-summary">
			<ProgressItem
				label="Calories"
				current={caloriesCurrent ?? 0}
				goal={caloriesGoal ?? 0}
				percent={caloriesPercent}
				category="calories"
				unit="kcal"
				exceeded={caloriesExceeded}
			/>
			<ProgressItem
				label="Protein"
				current={proteinCurrent ?? 0}
				goal={proteinGoal ?? 0}
				percent={proteinPercent}
				category="protein"
				unit="g"
				exceeded={proteinExceeded}
			/>
			<ProgressItem
				label="Steps"
				current={stepsCurrent ?? 0}
				goal={stepsGoal ?? 1000}
				percent={stepsPercent}
				category="steps"
				unit="steps"
				exceeded={stepsExceeded}
			/>
		</div>
	);
}
