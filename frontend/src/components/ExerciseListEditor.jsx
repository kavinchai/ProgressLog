import { useState, useEffect } from "react";
import api from "../api";
import useWeightUnit, { toDisplay, fromDisplay } from "../hooks/useWeightUnit";
import featuredConfig from "../config/featuredExercises.json";
import {
	fetchMatches,
	keepName,
	suggestionFor as closeSuggestion,
	usageLabel,
} from "../utils/exerciseMatches";

const FEATURED = new Set(
	(featuredConfig.strength ?? []).map((n) => n.toLowerCase()),
);
const MATCH_DELAY_MS = 250;

export function emptySet(num) {
	return { setNumber: num, reps: "", weightLbs: "" };
}

export function emptyExercise() {
	return { exerciseName: "", sets: [emptySet(1)] };
}

export function exercisesToForm(exercises, unit = "lbs") {
	return (exercises ?? []).map((ex) => ({
		exerciseName: ex.exerciseName,
		sets: (ex.sets ?? []).map((s) => ({
			setNumber: s.setNumber,
			reps: String(s.reps),
			weightLbs: String(toDisplay(s.weightLbs, unit) ?? ""),
		})),
	}));
}

export function exercisesToPayload(exercises, unit = "lbs") {
	return exercises
		.filter((ex) => ex.exerciseName.trim())
		.map((ex) => ({
			exerciseName: ex.exerciseName.trim(),
			sets: ex.sets.map((s) => ({
				setNumber: s.setNumber,
				reps: parseInt(s.reps) || 0,
				weightLbs: fromDisplay(s.weightLbs, unit) || 0,
			})),
		}));
}

/** Existing-lift matches for each typed name, looked up shortly after typing stops. */
function useNameMatches(exercises) {
	const [matches, setMatches] = useState({});
	const namesKey = [
		...new Set(exercises.map((ex) => ex.exerciseName.trim()).filter(Boolean)),
	].join("\n");

	useEffect(() => {
		if (!namesKey) return undefined;
		const timer = setTimeout(() => {
			for (const name of namesKey.split("\n")) {
				fetchMatches(name).then((result) =>
					setMatches((prev) =>
						prev[name] === result ? prev : { ...prev, [name]: result },
					),
				);
			}
		}, MATCH_DELAY_MS);
		return () => clearTimeout(timer);
	}, [namesKey]);

	return (name) => matches[name.trim()];
}

export default function ExerciseListEditor({ exercises, onChange }) {
	const { unit } = useWeightUnit();
	const [knownNames, setKnownNames] = useState([]);
	const [suggestionFor, setSuggestionFor] = useState(null);
	const [highlightedIdx, setHighlightedIdx] = useState(-1);
	// Exercises whose name field has been left at least once since editing.
	const [left, setLeft] = useState({});
	const [, setKeptCount] = useState(0);
	const matchesFor = useNameMatches(exercises);

	useEffect(() => {
		api
			.get("/workouts/exercise-names")
			.then((res) => setKnownNames(res.data))
			.catch(() => {});
	}, []);

	/** "Same lift?" matches first, then your other names containing the text. */
	function getFilteredSuggestions(value) {
		if (!value.trim()) return { same: [], maybe: [], also: [] };
		const found = matchesFor(value);
		const same = found?.same ?? [];
		const maybe = found?.possible ?? [];
		const taken = new Set([...same, ...maybe].map((m) => m.name));
		const lower = value.toLowerCase();
		const also = (Array.isArray(knownNames) ? knownNames : [])
			.filter(
				(n) =>
					n.toLowerCase().includes(lower) &&
					!taken.has(n) &&
					n !== value.trim(),
			)
			.slice(0, 8);
		return { same, maybe, also };
	}

	function flatSuggestions(value) {
		const { same, maybe, also } = getFilteredSuggestions(value);
		return [...same, ...maybe].map((m) => m.name).concat(also);
	}

	function keepTyped(exerciseIndex) {
		keepName(exercises[exerciseIndex].exerciseName);
		setKeptCount((n) => n + 1);
	}

	function selectSuggestion(exerciseIndex, name) {
		updateExerciseName(exerciseIndex, name);
		setSuggestionFor(null);
		setHighlightedIdx(-1);
	}

	function handleNameKeyDown(e, exerciseIndex) {
		if (suggestionFor !== exerciseIndex) return;
		const filtered = flatSuggestions(exercises[exerciseIndex].exerciseName);
		if (filtered.length === 0) return;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setHighlightedIdx((i) => Math.min(i + 1, filtered.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setHighlightedIdx((i) => Math.max(i - 1, -1));
		} else if (e.key === "Enter" && highlightedIdx >= 0) {
			e.preventDefault();
			selectSuggestion(exerciseIndex, filtered[highlightedIdx]);
		} else if (e.key === "Escape") {
			setSuggestionFor(null);
		}
	}

	function updateExerciseName(exerciseIndex, val) {
		onChange((prev) =>
			prev.map((ex, i) =>
				i === exerciseIndex ? { ...ex, exerciseName: val } : ex,
			),
		);
	}

	function addExercise() {
		onChange((prev) => [...prev, emptyExercise()]);
	}

	function removeExercise(exerciseIndex) {
		onChange((prev) => prev.filter((_, i) => i !== exerciseIndex));
		// "left the field" is tracked by position, so start fresh after a removal.
		setLeft({});
	}

	function addSet(exerciseIndex) {
		onChange((prev) =>
			prev.map((ex, i) => {
				if (i !== exerciseIndex) return ex;
				return { ...ex, sets: [...ex.sets, emptySet(ex.sets.length + 1)] };
			}),
		);
	}

	function removeSet(exerciseIndex, setIndex) {
		onChange((prev) =>
			prev.map((ex, i) => {
				if (i !== exerciseIndex) return ex;
				const sets = ex.sets
					.filter((_, j) => j !== setIndex)
					.map((s, j) => ({ ...s, setNumber: j + 1 }));
				return { ...ex, sets };
			}),
		);
	}

	function updateSet(exerciseIndex, setIndex, field, val) {
		onChange((prev) =>
			prev.map((ex, i) => {
				if (i !== exerciseIndex) return ex;
				const sets = ex.sets.map((s, j) =>
					j === setIndex ? { ...s, [field]: val } : s,
				);
				return { ...ex, sets };
			}),
		);
	}

	return (
		<>
			{exercises.length > 0 && (
				<div className="wbm-exercises">
					{exercises.map((ex, exerciseIndex) => (
						<div key={exerciseIndex} className="wbm-exercise-block">
							<div className="wbm-exercise-header">
								<div className="wbm-name-wrapper">
									<input
										className="modal-input wbm-exercise-name"
										type="text"
										placeholder="Exercise name"
										value={ex.exerciseName}
										onChange={(e) => {
											updateExerciseName(exerciseIndex, e.target.value);
											setSuggestionFor(exerciseIndex);
											setHighlightedIdx(-1);
										}}
										onFocus={() => setSuggestionFor(exerciseIndex)}
										onBlur={() => {
											setLeft((prev) => ({ ...prev, [exerciseIndex]: true }));
											setTimeout(() => setSuggestionFor(null), 150);
										}}
										onKeyDown={(e) => handleNameKeyDown(e, exerciseIndex)}
										autoComplete="off"
									/>
									{suggestionFor === exerciseIndex && (
										<SuggestionList
											{...getFilteredSuggestions(ex.exerciseName)}
											highlightedIdx={highlightedIdx}
											onPick={(name) => selectSuggestion(exerciseIndex, name)}
										/>
									)}
								</div>
								<button
									type="button"
									className="btn btn-sm"
									onClick={() => removeExercise(exerciseIndex)}
								>
									&times;
								</button>
							</div>

							{left[exerciseIndex] && suggestionFor !== exerciseIndex && (
								<NameCheck
									name={ex.exerciseName}
									matches={matchesFor(ex.exerciseName)}
									onUse={(name) => updateExerciseName(exerciseIndex, name)}
									onKeep={() => keepTyped(exerciseIndex)}
								/>
							)}

							<div className="wbm-sets">
								<div className="wbm-sets-head">
									<span>Set</span>
									<span>Weight ({unit})</span>
									<span>Reps</span>
									<span></span>
								</div>
								{ex.sets.map((s, setIndex) => (
									<div key={setIndex} className="wbm-set-row">
										<span className="wbm-set-num">{s.setNumber}</span>
										<input
											className="modal-input wbm-set-input"
											type="number"
											step="0.5"
											min="0"
											placeholder="0"
											value={s.weightLbs}
											onChange={(e) =>
												updateSet(
													exerciseIndex,
													setIndex,
													"weightLbs",
													e.target.value,
												)
											}
										/>
										<input
											className="modal-input wbm-set-input"
											type="number"
											min="0"
											placeholder="0"
											value={s.reps}
											onChange={(e) =>
												updateSet(
													exerciseIndex,
													setIndex,
													"reps",
													e.target.value,
												)
											}
										/>
										<button
											type="button"
											className="btn btn-sm"
											onClick={() => removeSet(exerciseIndex, setIndex)}
										>
											&times;
										</button>
									</div>
								))}
							</div>
							<button
								type="button"
								className="btn btn-sm wbm-add-set"
								onClick={() => addSet(exerciseIndex)}
							>
								+ Set
							</button>
						</div>
					))}
				</div>
			)}

			<div className="wbm-add-buttons">
				<button
					type="button"
					className="btn btn-sm wbm-add-exercise"
					onClick={addExercise}
				>
					+ Exercise
				</button>
			</div>
		</>
	);
}

function SuggestionList({ same, maybe, also, highlightedIdx, onPick }) {
	if (same.length + maybe.length + also.length === 0) return null;
	const matched = (m) => (
		<>
			{FEATURED.has(m.name.toLowerCase()) && (
				<span className="wbm-suggestion-tag">Featured</span>
			)}
			<span className="wbm-suggestion-usage">{usageLabel(m)}</span>
		</>
	);
	const sections = [
		["Same lift?", same.map((m) => [m.name, matched(m)])],
		["Maybe", maybe.map((m) => [m.name, matched(m)])],
		["Also used", also.map((name) => [name, null])],
	].filter(([, items]) => items.length > 0);
	const showHeadings = same.length + maybe.length > 0;
	let index = 0;
	return (
		<ul
			className="wbm-suggestions"
			role="listbox"
			aria-label="Exercise suggestions"
		>
			{sections.map(([heading, items]) => [
				showHeadings && (
					<li key={heading} role="presentation" className="wbm-suggestion-head">
						{heading}
					</li>
				),
				...items.map(([name, detail]) => {
					const i = index++;
					return (
						<li
							key={name}
							role="option"
							aria-selected={i === highlightedIdx}
							className={`wbm-suggestion${i === highlightedIdx ? " wbm-suggestion--active" : ""}`}
							onMouseDown={() => onPick(name)}
						>
							<span className="wbm-suggestion-name">{name}</span>
							{detail}
						</li>
					);
				}),
			])}
		</ul>
	);
}

/** After leaving the name field: "Did you mean …?" or a ✓ for an existing lift. */
function NameCheck({ name, matches, onUse, onKeep }) {
	const suggestion = closeSuggestion(name, matches);
	if (suggestion) {
		return (
			<div className="wbm-did" role="status">
				<span>
					Did you mean <b>{suggestion.name}</b>?
				</span>
				<span className="wbm-did-usage">
					{suggestion.yourSessions > 0
						? `You've logged it ${suggestion.yourSessions} time${suggestion.yourSessions === 1 ? "" : "s"}`
						: `Used by ${suggestion.lifters} lifter${suggestion.lifters === 1 ? "" : "s"} on the board`}
				</span>
				<div className="wbm-did-actions">
					<button
						type="button"
						className="btn btn-sm btn-primary"
						onClick={() => onUse(suggestion.name)}
					>
						Use {suggestion.name}
					</button>
					<button
						type="button"
						className="btn btn-sm btn-ghost"
						onClick={onKeep}
					>
						Keep “{name.trim()}”
					</button>
				</div>
			</div>
		);
	}
	if (matches?.exact?.yourSessions > 0 && matches.exact.name === name.trim()) {
		return <span className="wbm-name-ok">✓ Matches your existing lift</span>;
	}
	return null;
}
