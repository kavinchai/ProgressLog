import { useState } from "react";
import api from "../api";
import Modal from "./Modal";
import ExerciseListEditor, {
	emptyExercise,
	exercisesToForm,
	exercisesToPayload,
} from "./ExerciseListEditor";
import useWeightUnit from "../hooks/useWeightUnit";
import {
	clearMatchCache,
	fetchMatches,
	keepName,
	suggestionFor,
} from "../utils/exerciseMatches";
import "./WorkoutBuilderModal.css";

const now = new Date();
const TODAY = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

function setsToExercises(exerciseSets) {
	const byName = new Map();
	for (const set of exerciseSets ?? []) {
		const name = set.exerciseName ?? "";
		if (!byName.has(name)) byName.set(name, { exerciseName: name, sets: [] });
		byName.get(name).sets.push(set);
	}
	return Array.from(byName.values()).map((exercise) => ({
		...exercise,
		sets: [...exercise.sets].sort(
			(a, b) => (a.setNumber ?? 0) - (b.setNumber ?? 0),
		),
	}));
}

/** Typed names that look like an existing lift: [{ from, to }]. */
async function closeNames(exercises) {
	const names = [
		...new Set(exercises.map((ex) => ex.exerciseName.trim()).filter(Boolean)),
	];
	const found = await Promise.all(
		names.map(async (name) => {
			const match = suggestionFor(name, await fetchMatches(name));
			return match ? { from: name, to: match.name } : null;
		}),
	);
	return found.filter(Boolean);
}

function buildInitialExercises(existingSession, appendBlankExercise, unit) {
	const base = existingSession
		? exercisesToForm(setsToExercises(existingSession.exerciseSets), unit)
		: [];
	return appendBlankExercise ? [...base, emptyExercise()] : base;
}

export default function WorkoutBuilderModal({
	prefillDate,
	existingSession,
	appendBlankExercise = false,
	onClose,
	onSaved,
}) {
	const { unit } = useWeightUnit();
	const isEditing = Boolean(existingSession?.id);
	const [date, setDate] = useState(
		existingSession?.sessionDate ?? prefillDate ?? TODAY,
	);
	const [sessionName, setSessionName] = useState(
		existingSession?.sessionName ?? "",
	);
	const [exercises, setExercises] = useState(() =>
		buildInitialExercises(existingSession, appendBlankExercise, unit),
	);
	const [err, setErr] = useState("");
	const [saving, setSaving] = useState(false);
	// Close names found on Save, waiting for "use existing" or "save as typed".
	const [similar, setSimilar] = useState(null);

	async function submit(e) {
		e.preventDefault();
		setErr("");
		setSaving(true);
		const found = await closeNames(exercises);
		if (found.length > 0) {
			setSimilar(found);
			setSaving(false);
			return;
		}
		await save(exercises);
	}

	function applyExistingNames() {
		const renamed = exercises.map((ex) => {
			const swap = similar.find((s) => s.from === ex.exerciseName.trim());
			return swap ? { ...ex, exerciseName: swap.to } : ex;
		});
		setExercises(renamed);
		setSimilar(null);
		save(renamed);
	}

	function saveAsTyped() {
		for (const { from } of similar) keepName(from);
		setSimilar(null);
		save(exercises);
	}

	async function save(list) {
		setSaving(true);
		try {
			const payload = {
				sessionDate: date,
				sessionName: sessionName.trim() || null,
				exercises: exercisesToPayload(list, unit),
			};
			if (isEditing) {
				await api.put(`/workouts/${existingSession.id}`, payload);
			} else {
				await api.post("/workouts", payload);
			}
			clearMatchCache();
			onSaved();
			onClose();
		} catch (ex) {
			setErr(ex.response?.data?.message ?? "Failed to save.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<Modal title={isEditing ? "Edit Workout" : "Log Workout"} onClose={onClose}>
			<form className="wbm-form" onSubmit={submit}>
				{err && <div className="modal-error">{err}</div>}

				<div className="modal-field">
					<label className="modal-label">Date</label>
					<input
						className="modal-input"
						type="date"
						value={date}
						onChange={(e) => setDate(e.target.value)}
						required
					/>
				</div>

				<div className="modal-field">
					<label className="modal-label">Session Name</label>
					<input
						className="modal-input"
						type="text"
						placeholder="e.g. Push, Pull, Legs"
						value={sessionName}
						onChange={(e) => setSessionName(e.target.value)}
					/>
				</div>

				<ExerciseListEditor exercises={exercises} onChange={setExercises} />

				{similar && (
					<div
						className="wbm-similar"
						role="alertdialog"
						aria-label="Similar names"
						ref={(el) => el?.scrollIntoView?.({ block: "nearest" })}
					>
						<h3 className="wbm-similar-title">
							{similar.length === 1
								? "1 name looks like a lift you already have"
								: `${similar.length} names look like lifts you already have`}
						</h3>
						{similar.map(({ from, to }) => (
							<div key={from} className="wbm-similar-row">
								<span className="wbm-similar-old">{from}</span>
								<span aria-hidden="true">→</span>
								<span className="wbm-similar-new">{to}</span>
							</div>
						))}
						<div className="wbm-did-actions">
							<button
								type="button"
								className="btn btn-sm btn-primary"
								onClick={applyExistingNames}
							>
								Use existing names &amp; save
							</button>
							<button
								type="button"
								className="btn btn-sm"
								onClick={saveAsTyped}
							>
								Save as typed
							</button>
						</div>
					</div>
				)}

				<div className="modal-actions">
					<button type="button" className="btn-ghost" onClick={onClose}>
						Cancel
					</button>
					<button
						type="submit"
						className="btn-primary"
						disabled={saving || Boolean(similar)}
					>
						{saving ? "Saving..." : "Save"}
					</button>
				</div>
			</form>
		</Modal>
	);
}
