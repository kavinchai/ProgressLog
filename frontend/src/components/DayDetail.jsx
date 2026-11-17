import { useState } from "react";
import { useDayActions } from "../hooks/useDayActions";
import useWeightUnit from "../hooks/useWeightUnit";
import WeightModal from "./WeightModal";
import DayInfoModal from "./DayInfoModal";
import MealCards from "./MealCards";
import WorkoutBuilderModal from "./WorkoutBuilderModal";
import EditExerciseModal from "./EditExerciseModal";
import SwipeRow from "./SwipeRow";
import MoreMenu from "./MoreMenu";
import useDeleteWithUndo from "../hooks/useDeleteWithUndo";
import useLongPress from "../hooks/useLongPress";
import api from "../api";
import { groupByExercise } from "../utils/workout";

export default function DayDetail({
	date,
	weightEntry,
	nutritionEntry,
	nutritionData,
	workoutEntry,
	stepEntry,
	onRefetchW,
	onRefetchN,
	onRefetchWo,
	onRefetchS,
	showDelete = true,
	workoutOnly = false,
}) {
	const { unit, toDisplay } = useWeightUnit();
	const [modal, setModal] = useState(null);
	const [editExercise, setEditExercise] = useState(null);
	const [editingSteps, setEditingSteps] = useState(false);
	const [stepsValue, setStepsValue] = useState("");
	const [workoutMenuOpen, setWorkoutMenuOpen] = useState(false);
	const [nutritionMenuOpen, setNutritionMenuOpen] = useState(false);
	const deleteWithUndo = useDeleteWithUndo();
	const workoutLongPress = useLongPress(() => setWorkoutMenuOpen(true));
	const nutritionLongPress = useLongPress(() => setNutritionMenuOpen(true));
	const [appendBlank, setAppendBlank] = useState(false);

	const canAppendExercise = workoutEntry?._sessionCount === 1;

	const {
		renamingSession,
		setRenamingSession,
		renameValue,
		setRenameValue,
		submitRename,
		saveSteps,
		getOrCreateNutritionLogId,
	} = useDayActions({
		date,
		nutritionEntry,
		workoutEntry,
		stepEntry,
		onRefetchN,
		onRefetchWo,
		onRefetchS,
	});

	const exerciseGroups = workoutEntry?.exerciseSets?.length
		? groupByExercise(workoutEntry.exerciseSets)
		: [];

	const meals = nutritionEntry?.meals ?? [];

	// Session summary for the workout-only view: exercises · sets · volume.
	const workoutSets = workoutEntry?.exerciseSets ?? [];
	const workoutSummary = (() => {
		if (workoutSets.length === 0) return null;
		const exercises = new Set(groupByExercise(workoutSets).map((g) => g.name))
			.size;
		const volume = workoutSets.reduce(
			(sum, s) => sum + (Number(s.weightLbs) || 0) * (Number(s.reps) || 0),
			0,
		);
		const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
		return (
			`${plural(exercises, "exercise")} · ${plural(workoutSets.length, "set")} · ` +
			`${Math.round(Number(toDisplay(volume))).toLocaleString()} ${unit} volume`
		);
	})();

	function close() {
		setModal(null);
	}

	function saveStepsAndClose() {
		saveSteps(stepsValue || null);
		setEditingSteps(false);
	}

	// Deleting is offered (swipe, menu) only where showDelete allows it.
	function deleter(remove, message, refresh) {
		if (!showDelete) return undefined;
		return () => deleteWithUndo({ remove, message, refresh });
	}

	function addWorkout() {
		setAppendBlank(canAppendExercise);
		setModal("workout-add");
	}

	return (
		<div className="day-detail">
			{!workoutOnly && (
				<>
					{/* Weight */}
					<div className="day-detail-section">
						{weightEntry ? (
							<SwipeRow
								label="Weight"
								openLabel="Edit weight"
								className="day-detail-row"
								onOpen={() => setModal("weight-edit")}
								onDelete={deleter(
									() => api.delete(`/weight/${weightEntry.id}`),
									"Weight deleted",
									onRefetchW,
								)}
							>
								<span className="day-detail-label">Weight</span>
								<span className="day-detail-value">
									{toDisplay(weightEntry.weightLbs) + " " + unit}
								</span>
							</SwipeRow>
						) : (
							<button
								className="day-detail-row day-detail-add"
								aria-label="+ Add weight"
								onClick={() => setModal("weight-add")}
							>
								<span className="day-detail-label">Weight</span>
								<span className="day-detail-add-label">+ Add</span>
							</button>
						)}
					</div>
					{/* Nutrition */}
					<div className="day-detail-section">
						<div
							className="day-detail-section-head"
							{...(nutritionEntry && nutritionLongPress)}
						>
							<span className="day-detail-label">Nutrition</span>
							{nutritionEntry && (
								<MoreMenu
									label="More actions for nutrition"
									open={nutritionMenuOpen}
									onOpenChange={setNutritionMenuOpen}
									items={[
										{ label: "Edit day", onSelect: () => setModal("dayinfo") },
										{
											label: "Delete nutrition log",
											destructive: true,
											hidden: !showDelete,
											onSelect: deleter(
												() => api.delete(`/nutrition/${nutritionEntry.id}`),
												"Nutrition log deleted",
												onRefetchN,
											),
										},
									]}
								/>
							)}
						</div>
						<MealCards
							nutritionEntry={nutritionEntry ?? null}
							nutritionData={nutritionData}
							getOrCreateNutritionLogId={getOrCreateNutritionLogId}
							onSaved={onRefetchN}
						/>
						{meals.length > 0 && (
							<div className="day-nutrition-total">
								Total: {nutritionEntry.totalCalories ?? 0} kcal /{" "}
								{nutritionEntry.totalProtein ?? 0}g protein
							</div>
						)}
					</div>
					{/* Steps */}
					<div className="day-detail-section">
						{editingSteps ? (
							<div className="today-steps-edit">
								<input
									className="modal-input"
									type="number"
									min="0"
									placeholder="Steps"
									aria-label="Steps"
									value={stepsValue}
									onChange={(e) => setStepsValue(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") saveStepsAndClose();
										if (e.key === "Escape") setEditingSteps(false);
									}}
									autoFocus
								/>
								<button
									className="btn btn-sm btn-primary"
									onClick={saveStepsAndClose}
								>
									Save
								</button>
								<button
									className="btn btn-sm"
									onClick={() => setEditingSteps(false)}
								>
									&times;
								</button>
							</div>
						) : stepEntry ? (
							<SwipeRow
								label="Steps"
								openLabel="Edit steps"
								className="day-detail-row"
								onOpen={() => {
									setStepsValue(String(stepEntry.steps));
									setEditingSteps(true);
								}}
								onDelete={deleter(
									() => api.delete(`/steps/${stepEntry.id}`),
									"Steps deleted",
									onRefetchS,
								)}
							>
								<span className="day-detail-label">Steps</span>
								<span className="day-detail-value">
									{stepEntry.steps.toLocaleString() + " steps"}
								</span>
							</SwipeRow>
						) : (
							<button
								className="day-detail-row day-detail-add"
								aria-label="+ Add steps"
								onClick={() => {
									setStepsValue("");
									setEditingSteps(true);
								}}
							>
								<span className="day-detail-label">Steps</span>
								<span className="day-detail-add-label">+ Add</span>
							</button>
						)}
					</div>
				</>
			)}
			{/* Workout */}
			<div className="day-detail-section">
				<div
					className="day-detail-section-head"
					{...(workoutEntry && workoutLongPress)}
				>
					<span className="day-detail-label">
						Workout
						{workoutEntry?.sessionName && (
							<span
								className="muted"
								style={{ fontWeight: 400, marginLeft: 8, fontSize: "0.85em" }}
							>
								{workoutEntry.sessionName}
							</span>
						)}
					</span>
					<div className="btn-actions">
						{renamingSession ? (
							<>
								<input
									className="modal-input"
									style={{ width: 120, padding: "2px 6px" }}
									type="text"
									placeholder="Session name"
									aria-label="Session name"
									value={renameValue}
									onChange={(e) => setRenameValue(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") submitRename();
										if (e.key === "Escape") setRenamingSession(false);
									}}
									autoFocus
								/>
								<button
									className="btn btn-sm btn-primary"
									onClick={submitRename}
								>
									Save
								</button>
								<button
									className="btn btn-sm"
									onClick={() => setRenamingSession(false)}
								>
									&times;
								</button>
							</>
						) : workoutEntry ? (
							<MoreMenu
								label="More actions for workout"
								open={workoutMenuOpen}
								onOpenChange={setWorkoutMenuOpen}
								items={[
									{
										label: "Rename",
										onSelect: () => {
											setRenameValue(workoutEntry.sessionName ?? "");
											setRenamingSession(true);
										},
									},
									{
										label: "Delete workout",
										destructive: true,
										hidden: !showDelete,
										onSelect: deleter(
											() => api.delete(`/workouts/${workoutEntry.id}`),
											"Workout deleted",
											onRefetchWo,
										),
									},
								]}
							/>
						) : (
							<button className="btn btn-sm btn-primary" onClick={addWorkout}>
								+ Add
							</button>
						)}
					</div>
				</div>
				{workoutOnly && workoutSummary && (
					<div className="day-detail-value muted">{workoutSummary}</div>
				)}
				{workoutEntry ? (
					<>
						{exerciseGroups.length > 0 ? (
							<div className="day-exercise-list">
								{exerciseGroups.map((g) => {
									const sessionId = g.sets[0]._sessionId ?? workoutEntry.id;
									return (
										<SwipeRow
											key={`${g.name}-${g.weight}`}
											label={g.name}
											openLabel={`Edit ${g.name}`}
											className="day-exercise-item"
											onOpen={() =>
												setEditExercise({
													sessionId,
													name: g.name,
													sets: g.sets,
												})
											}
											onDelete={deleter(
												() =>
													api.delete(`/workouts/${sessionId}/exercises`, {
														params: { name: g.name },
													}),
												`${g.name} deleted`,
												onRefetchWo,
											)}
										>
											<div className="day-exercise-row">
												<span className="day-exercise-name">{g.name}</span>
												{g.weight != null && (
													<span className="muted">
														{toDisplay(g.weight)} {unit}
													</span>
												)}
											</div>
											<div className="day-exercise-reps">
												{g.sets.map((s) => s.reps ?? "--").join("  ")}
											</div>
										</SwipeRow>
									);
								})}
							</div>
						) : (
							<div className="day-detail-value">
								<span className="muted">session logged</span>
							</div>
						)}
						<button className="day-detail-add-exercise" onClick={addWorkout}>
							{canAppendExercise ? "+ Add exercise" : "+ Add workout"}
						</button>
					</>
				) : (
					<div className="day-detail-value">
						<span className="muted">--</span>
					</div>
				)}
			</div>
			{/* Modals */}
			{(modal === "weight-add" || modal === "weight-edit") && (
				<WeightModal
					prefillDate={date}
					existing={modal === "weight-edit" ? weightEntry : null}
					onClose={close}
					onSaved={onRefetchW}
				/>
			)}
			{modal === "dayinfo" && (
				<DayInfoModal
					prefillDate={date}
					existing={nutritionEntry}
					onClose={close}
					onSaved={onRefetchN}
				/>
			)}
			{modal === "workout-add" && (
				<WorkoutBuilderModal
					prefillDate={date}
					existingSession={canAppendExercise ? workoutEntry : null}
					appendBlankExercise={appendBlank}
					onClose={close}
					onSaved={onRefetchWo}
				/>
			)}
			{editExercise && (
				<EditExerciseModal
					sessionId={editExercise.sessionId}
					exerciseName={editExercise.name}
					exerciseSets={editExercise.sets}
					onClose={() => setEditExercise(null)}
					onSaved={onRefetchWo}
				/>
			)}
		</div>
	);
}
