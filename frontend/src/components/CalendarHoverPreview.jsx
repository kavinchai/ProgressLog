import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import "./CalendarHoverPreview.css";

/**
 * Renders an inline hover-trigger span wrapping children.
 * On hover (desktop only), a small tooltip box appears above via a portal,
 * avoiding any overflow:hidden clipping from parent elements.
 *
 * Props:
 *  - type: "calories" | "workout"
 *  - row: the day-row object (nutritionEntry, workoutEntry, etc.)
 *  - onDateClick: () => void — called on click to open the day modal
 *  - children: the metric content (displayed inline)
 */
export default function CalendarHoverPreview({
	type,
	row,
	onDateClick,
	children,
}) {
	const [visible, setVisible] = useState(false);
	const [pos, setPos] = useState(null);
	const timeoutRef = useRef(null);
	const wrapRef = useRef(null);

	const updatePosition = useCallback(() => {
		if (!wrapRef.current) return;
		const rect = wrapRef.current.getBoundingClientRect();
		setPos({
			top: rect.top,
			left: rect.left + rect.width / 2,
		});
	}, []);

	function show() {
		clearTimeout(timeoutRef.current);
		updatePosition();
		setVisible(true);
	}
	function hide() {
		timeoutRef.current = setTimeout(() => setVisible(false), 120);
	}

	useEffect(() => () => clearTimeout(timeoutRef.current), []);

	const content = buildContent(type, row);
	if (!content) return children;

	return (
		<span
			className="cal-hover-wrap"
			ref={wrapRef}
			onMouseEnter={show}
			onMouseLeave={hide}
			onClick={(e) => {
				e.stopPropagation();
				onDateClick();
			}}
		>
			{children}
			{visible &&
				pos &&
				createPortal(
					<div
						className="cal-hover-box"
						role="tooltip"
						style={{ top: pos.top, left: pos.left }}
						onMouseEnter={show}
						onMouseLeave={hide}
					>
						{content}
					</div>,
					document.body,
				)}
		</span>
	);
}

function buildContent(type, row) {
	if (type === "calories") {
		const meals = row.nutritionEntry?.meals ?? [];
		if (meals.length === 0) return null;
		return (
			<div className="cal-hover-content">
				<div className="cal-hover-title">Meals</div>
				<ul className="cal-hover-list">
					{meals.map((meal, i) => (
						<li key={meal.id ?? i} className="cal-hover-item">
							<span className="cal-hover-item-name">
								{meal.mealName || `Meal ${i + 1}`}
							</span>
							<span className="cal-hover-item-detail">
								{meal.calories} kcal · {meal.proteinGrams}g
							</span>
						</li>
					))}
				</ul>
				<div className="cal-hover-total">
					Total: {row.nutritionEntry.totalCalories ?? 0} kcal /{" "}
					{row.nutritionEntry.totalProtein ?? 0}g protein
				</div>
			</div>
		);
	}

	if (type === "workout") {
		const entry = row.workoutEntry;
		if (!entry) return null;
		const sets = entry.exerciseSets ?? [];
		const exercises = [...new Set(sets.map((s) => s.exerciseName))];
		if (exercises.length === 0 && !entry.sessionName) return null;
		return (
			<div className="cal-hover-content">
				<div className="cal-hover-title">{entry.sessionName || "Workout"}</div>
				{exercises.length > 0 && (
					<ul className="cal-hover-list">
						{exercises.map((name) => (
							<li key={name} className="cal-hover-item">
								<span className="cal-hover-item-name">{name}</span>
								<span className="cal-hover-item-detail">
									{sets.filter((s) => s.exerciseName === name).length} sets
								</span>
							</li>
						))}
					</ul>
				)}
			</div>
		);
	}

	return null;
}
