import { CircleMinus, CirclePlus } from "lucide-react";
import { useState } from "react";
import api from "../api";
import { errorMessage } from "../utils/errors";
import { tapDelete, tapSuccess } from "../native/haptics";
import Modal from "./Modal";
import useWeightUnit from "../hooks/useWeightUnit";
import "./WorkoutBuilderModal.css";

/** exerciseSets: all SetDTO rows for one exercise name in a session */
export default function EditExerciseModal({
	sessionId,
	exerciseName,
	exerciseSets,
	onClose,
	onSaved,
}) {
	const { unit, toDisplay, fromDisplay } = useWeightUnit();

	const initialSets = exerciseSets.map((s) => ({
		setNumber: s.setNumber,
		reps: String(s.reps ?? ""),
		weightLbs: String(toDisplay(s.weightLbs) ?? ""),
	}));

	const [sets, setSets] = useState(initialSets);
	const [err, setErr] = useState("");
	const [saving, setSaving] = useState(false);
	const [deletePhase, setDeletePhase] = useState(null); // null | 'confirm' | 'deleted' | 'undoing' | 'undone'

	function removeSet(setIndex) {
		setSets((prev) =>
			prev
				.filter((_, i) => i !== setIndex)
				.map((s, i) => ({ ...s, setNumber: i + 1 })),
		);
	}

	function addSet() {
		setSets((prev) => [
			...prev,
			{ setNumber: prev.length + 1, reps: "", weightLbs: "" },
		]);
	}

	function updateSet(setIndex, field, val) {
		setSets((prev) =>
			prev.map((s, i) => (i === setIndex ? { ...s, [field]: val } : s)),
		);
	}

	async function submit(e) {
		e.preventDefault();
		if (saving) return;
		setErr("");
		setSaving(true);
		try {
			const mappedSets = sets.map((s) => ({
				setNumber: s.setNumber,
				reps: parseInt(s.reps) || 0,
				weightLbs: fromDisplay(s.weightLbs) || 0,
			}));

			await api.post("/workouts/" + sessionId + "/exercises", {
				exerciseName,
				sets: mappedSets,
			});
			tapSuccess();
			onSaved();
			onClose();
		} catch (ex) {
			setErr(errorMessage(ex, "Failed to save."));
		} finally {
			setSaving(false);
		}
	}

	async function deleteExercise() {
		if (saving) return;
		setSaving(true);
		try {
			await api.delete("/workouts/" + sessionId + "/exercises", {
				params: { name: exerciseName },
			});
			tapDelete();
			onSaved();
			setDeletePhase("deleted");
		} catch (ex) {
			setErr(
				errorMessage(
					ex,
					"Failed to delete.",
					"You're offline. Connect to delete this.",
				),
			);
			setDeletePhase(null);
		} finally {
			setSaving(false);
		}
	}

	async function handleUndo() {
		setDeletePhase("undoing");
		try {
			await api.post("/undo");
			onSaved();
			setDeletePhase("undone");
		} catch {
			setErr("Undo failed.");
			setDeletePhase("deleted");
		}
	}

	return (
		<Modal
			title={exerciseName}
			onClose={onClose}
			form={{ id: "edit-exercise-form", saving }}
		>
			<form id="edit-exercise-form" className="modal-form" onSubmit={submit}>
				{err && <div className="modal-error">{err}</div>}

				<div className="sheet-section-header">Sets · {unit} × reps</div>
				<div className="sheet-group">
					{sets.map((s, setIndex) => (
						<div key={setIndex} className="sheet-set-row">
							<span className="sheet-set-label">Set {s.setNumber}</span>
							<input
								className="sheet-set-input"
								type="number"
								inputMode="decimal"
								step="0.5"
								min="0"
								aria-label={`Set ${s.setNumber} weight`}
								value={s.weightLbs}
								onChange={(e) =>
									updateSet(setIndex, "weightLbs", e.target.value)
								}
							/>
							<span className="sheet-field-unit" aria-hidden="true">
								×
							</span>
							<input
								className="sheet-set-input sheet-set-input--reps"
								type="number"
								inputMode="numeric"
								min="0"
								aria-label={`Set ${s.setNumber} reps`}
								value={s.reps}
								onChange={(e) => updateSet(setIndex, "reps", e.target.value)}
							/>
							<button
								type="button"
								className="sheet-set-remove"
								aria-label={`Remove set ${s.setNumber}`}
								onClick={() => removeSet(setIndex)}
							>
								<CircleMinus size={20} aria-hidden="true" />
							</button>
						</div>
					))}
					<button type="button" className="sheet-add-row" onClick={addSet}>
						<CirclePlus size={20} aria-hidden="true" />
						Add set
					</button>
				</div>

				<div className="sheet-group sheet-group--spaced">
					{!deletePhase && (
						<button
							type="button"
							className="sheet-row-button sheet-row-button--danger"
							onClick={() => setDeletePhase("confirm")}
							disabled={saving}
						>
							Delete exercise
						</button>
					)}
					{deletePhase === "confirm" && (
						<>
							<button
								type="button"
								className="sheet-row-button sheet-row-button--danger"
								onClick={deleteExercise}
								disabled={saving}
							>
								Confirm delete
							</button>
							<button
								type="button"
								className="sheet-row-button"
								onClick={() => setDeletePhase(null)}
							>
								Keep exercise
							</button>
						</>
					)}
					{deletePhase === "deleted" && (
						<>
							<div className="sheet-row-note">Exercise deleted.</div>
							<button
								type="button"
								className="sheet-row-button"
								onClick={handleUndo}
							>
								Undo
							</button>
							<button
								type="button"
								className="sheet-row-button"
								onClick={onClose}
							>
								Done
							</button>
						</>
					)}
					{deletePhase === "undoing" && (
						<div className="sheet-row-note">Restoring…</div>
					)}
					{deletePhase === "undone" && (
						<>
							<div className="sheet-row-note">Restored.</div>
							<button
								type="button"
								className="sheet-row-button"
								onClick={onClose}
							>
								OK
							</button>
						</>
					)}
				</div>
			</form>
		</Modal>
	);
}
