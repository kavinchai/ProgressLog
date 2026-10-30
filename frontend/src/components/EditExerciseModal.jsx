import { useState } from "react";
import api from "../api";
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
			onSaved();
			onClose();
		} catch (ex) {
			setErr(ex.response?.data?.message ?? "Failed to save.");
		} finally {
			setSaving(false);
		}
	}

	async function deleteExercise() {
		setSaving(true);
		try {
			await api.delete("/workouts/" + sessionId + "/exercises", {
				params: { name: exerciseName },
			});
			onSaved();
			setDeletePhase("deleted");
		} catch (ex) {
			setErr(ex.response?.data?.message ?? "Failed to delete.");
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
		<Modal title={"Edit: " + exerciseName} onClose={onClose}>
			<form className="wbm-form" onSubmit={submit}>
				{err && <div className="modal-error">{err}</div>}

				<div className="wbm-sets">
					<div className="wbm-sets-head">
						<span>Set</span>
						<span>Weight ({unit})</span>
						<span>Reps</span>
						<span></span>
					</div>
					{sets.map((s, setIndex) => (
						<div key={setIndex} className="wbm-set-row">
							<span className="wbm-set-num">{s.setNumber}</span>
							<input
								className="modal-input wbm-set-input"
								type="number"
								step="0.5"
								min="0"
								value={s.weightLbs}
								onChange={(e) =>
									updateSet(setIndex, "weightLbs", e.target.value)
								}
							/>
							<input
								className="modal-input wbm-set-input"
								type="number"
								min="0"
								value={s.reps}
								onChange={(e) => updateSet(setIndex, "reps", e.target.value)}
							/>
							<button
								type="button"
								className="btn btn-sm"
								onClick={() => removeSet(setIndex)}
							>
								&times;
							</button>
						</div>
					))}
					<button type="button" className="btn btn-sm" onClick={addSet}>
						+ Set
					</button>
				</div>

				{!deletePhase && (
					<div
						className="modal-actions"
						style={{ justifyContent: "space-between" }}
					>
						<button
							type="button"
							className="btn btn-sm btn-danger"
							onClick={() => setDeletePhase("confirm")}
							disabled={saving}
						>
							Delete Exercise
						</button>
						<div style={{ display: "flex", gap: 8 }}>
							<button type="button" className="btn-ghost" onClick={onClose}>
								Cancel
							</button>
							<button type="submit" className="btn-primary" disabled={saving}>
								{saving ? "Saving..." : "Save"}
							</button>
						</div>
					</div>
				)}
				{deletePhase === "confirm" && (
					<div
						className="modal-actions"
						style={{ justifyContent: "space-between" }}
					>
						<span style={{ fontSize: "var(--fs-sm)", color: "var(--danger)" }}>
							Delete this exercise?
						</span>
						<div style={{ display: "flex", gap: 8 }}>
							<button
								type="button"
								className="btn-ghost"
								onClick={() => setDeletePhase(null)}
							>
								Cancel
							</button>
							<button
								type="button"
								className="btn btn-sm btn-danger"
								onClick={deleteExercise}
								disabled={saving}
							>
								Confirm Delete
							</button>
						</div>
					</div>
				)}
				{deletePhase === "deleted" && (
					<div
						className="modal-actions"
						style={{ justifyContent: "space-between" }}
					>
						<span style={{ fontSize: "var(--fs-sm)" }}>Exercise deleted.</span>
						<div style={{ display: "flex", gap: 8 }}>
							<button type="button" className="btn-ghost" onClick={onClose}>
								Done
							</button>
							<button
								type="button"
								className="btn btn-sm btn-primary"
								onClick={handleUndo}
							>
								Undo
							</button>
						</div>
					</div>
				)}
				{deletePhase === "undoing" && (
					<div className="modal-actions">
						<span style={{ fontSize: "var(--fs-sm)" }}>Restoring...</span>
					</div>
				)}
				{deletePhase === "undone" && (
					<div
						className="modal-actions"
						style={{ justifyContent: "space-between" }}
					>
						<span style={{ fontSize: "var(--fs-sm)", color: "var(--success)" }}>
							Restored!
						</span>
						<button
							type="button"
							className="btn btn-sm btn-primary"
							onClick={onClose}
						>
							OK
						</button>
					</div>
				)}
			</form>
		</Modal>
	);
}
