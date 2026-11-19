import { CirclePlus } from "lucide-react";
import { useState } from "react";
import { useDayActions } from "../hooks/useDayActions";
import useWeightUnit from "../hooks/useWeightUnit";
import WeightModal from "./WeightModal";
import StepsModal from "./StepsModal";
import DayInfoModal from "./DayInfoModal";
import MealCards from "./MealCards";
import WorkoutBuilderModal from "./WorkoutBuilderModal";
import EditExerciseModal from "./EditExerciseModal";
import SwipeRow from "./SwipeRow";
import StatusRow, { AddRow } from "./StatusRow";
import ExerciseRow from "./ExerciseRow";
import MoreMenu from "./MoreMenu";
import useDeleteWithUndo from "../hooks/useDeleteWithUndo";
import useLongPress from "../hooks/useLongPress";
import api from "../api";
import { exerciseSummary, groupByExercise } from "../utils/workout";

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
		getOrCreateNutritionLogId,
	} = useDayActions({
		date,
		nutritionEntry,
		workoutEntry,
		onRefetchN,
		onRefetchWo,
	});

	const exerciseGroups = workoutEntry?.exerciseSets?.length
		? groupByExercise(workoutEntry.exerciseSets)
		: [];

	const meals = nutritionEntry?.meals ?? [];

	// Session summary for the workout-only view: exercises · sets · volume.
	const workoutSets = workoutEntry?.exerciseSets ?? [];
	const workoutSummary = (() => {
		if (workoutSets.length === 0) return null;
		const volume = workoutSets.reduce(
			(sum, s) => sum + (Number(s.weightLbs) || 0) * (Number(s.reps) || 0),
			0,
		);
		return (
			`${exerciseSummary(workoutSets)} · ` +
			`${Math.round(Number(toDisplay(volume))).toLocaleString()} ${unit} volume`
		);
	})();

	function close() {
		setModal(null);
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
								<StatusRow
									status="done"
									title="Weight"
									detail={toDisplay(weightEntry.weightLbs) + " " + unit}
								/>
							</SwipeRow>
						) : (
							<AddRow
								title="Weight"
								label="+ Add weight"
								className="day-detail-row"
								onClick={() => setModal("weight-add")}
							/>
						)}
					</div>
					{/* Nutrition */}
					<div className="day-detail-section">
						<div
							className="day-detail-section-head"
							{...(nutritionEntry && nutritionLongPress)}
						>
							<span className="day-detail-label">Nutrition</span>
							{meals.length > 0 && (
								<span className="day-detail-meta">
									{(nutritionEntry.totalCalories ?? 0).toLocaleString()} kcal ·{" "}
									{nutritionEntry.totalProtein ?? 0} g
								</span>
							)}
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
					</div>
					{/* Steps */}
					<div className="day-detail-section">
						{stepEntry ? (
							<SwipeRow
								label="Steps"
								openLabel="Edit steps"
								className="day-detail-row"
								onOpen={() => setModal("steps-edit")}
								onDelete={deleter(
									() => api.delete(`/steps/${stepEntry.id}`),
									"Steps deleted",
									onRefetchS,
								)}
							>
								<StatusRow
									status="done"
									title="Steps"
									detail={stepEntry.steps.toLocaleString() + " steps"}
								/>
							</SwipeRow>
						) : (
							<AddRow
								title="Steps"
								label="+ Add steps"
								className="day-detail-row"
								onClick={() => setModal("steps-add")}
							/>
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
							<>
								{!workoutOnly && workoutSets.length > 0 && (
									<span className="day-detail-meta">
										{exerciseSummary(workoutSets)}
									</span>
								)}
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
							</>
						) : null}
					</div>
				</div>
				{workoutOnly && workoutSummary && (
					<div className="day-detail-value muted">{workoutSummary}</div>
				)}
				{workoutEntry ? (
					<div className="status-rows">
						{exerciseGroups.length === 0 && (
							<div className="status-row-static">
								<StatusRow status="empty" title="No exercises yet" />
							</div>
						)}
						{exerciseGroups.map((g) => {
							const sessionId = g.sets[0]._sessionId ?? workoutEntry.id;
							return (
								<SwipeRow
									key={`${g.name}-${g.weight}`}
									label={g.name}
									openLabel={`Edit ${g.name}`}
									className="exercise-row"
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
									<ExerciseRow name={g.name} weight={g.weight} sets={g.sets} />
								</SwipeRow>
							);
						})}
						<div className="status-rows-footer">
							<button
								type="button"
								className="status-add-chip"
								onClick={addWorkout}
							>
								<CirclePlus size={20} aria-hidden="true" />
								{canAppendExercise ? "Add exercise" : "Add workout"}
							</button>
						</div>
					</div>
				) : (
					<AddRow
						title="No workout"
						label="+ Add workout"
						className="day-detail-row"
						onClick={addWorkout}
					/>
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
			{(modal === "steps-add" || modal === "steps-edit") && (
				<StepsModal
					prefillDate={date}
					existing={modal === "steps-edit" ? stepEntry : null}
					onClose={close}
					onSaved={onRefetchS}
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
