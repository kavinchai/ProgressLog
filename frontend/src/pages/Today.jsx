import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import api from "../api";
import useWeightLog from "../hooks/useWeightLog";
import useNutrition from "../hooks/useNutrition";
import useWorkouts from "../hooks/useWorkouts";
import useSteps from "../hooks/useSteps";
import useUserProfile from "../hooks/useUserProfile";
import usePRs from "../hooks/usePRs";
import { useDayActions } from "../hooks/useDayActions";
import WeightModal from "../components/WeightModal";
import DayInfoModal from "../components/DayInfoModal";
import MealCards from "../components/MealCards";
import WorkoutBuilderModal from "../components/WorkoutBuilderModal";
import EditExerciseModal from "../components/EditExerciseModal";
import DailyProgressBar from "../components/DailyProgressBar";
import SwipeRow from "../components/SwipeRow";
import MoreMenu from "../components/MoreMenu";
import useDeleteWithUndo from "../hooks/useDeleteWithUndo";
import useLongPress from "../hooks/useLongPress";
import { groupByExercise } from "../utils/workout";
import { mergeWorkoutSessions } from "../utils/stats";
import useWeightUnit from "../hooks/useWeightUnit";
import useToday from "../hooks/useToday";
import { todayTotals } from "../utils/widget";
import { formatDayLabel } from "../utils/date";
import "../pages/WeeklyStats.css";
import "./Today.css";

// ── Exercise cards ────────────────────────────────────────────────────────────

// Tapping, swiping or long-pressing the card is handled by the SwipeRow around it.
function ExerciseCard({ name, weight, sets, isPR }) {
	const { unit, toDisplay } = useWeightUnit();

	return (
		<div className="exercise-card">
			<div className="exercise-card-header">
				<span className="exercise-card-name">
					{name}
					<span className="exercise-card-weight">
						{toDisplay(weight)} {unit}
					</span>
					{isPR && <span className="pr-badge">PR</span>}
				</span>
			</div>
			<div className="exercise-card-sets">
				<>
					<div className="exercise-sets-head">
						<span>Set</span>
						<span>Weight</span>
						<span>Reps</span>
					</div>
					{sets.map((s) => (
						<div key={s.id} className="exercise-set-row">
							<span>{s.setNumber}</span>
							<span>
								{toDisplay(s.weightLbs)} {unit}
							</span>
							<span>{s.reps}</span>
						</div>
					))}
				</>
			</div>
		</div>
	);
}

// ── Data row ──────────────────────────────────────────────────────────────────

function DataRow({ label, value }) {
	return (
		<div className="today-data-row">
			<span className="today-data-label">{label}</span>
			<span className="today-data-value">{value ?? "--"}</span>
		</div>
	);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Today() {
	const TODAY = useToday();
	const {
		data: weightData,
		refetch: refetchWeight,
		loading: loadingWeight,
		error: errorWeight,
	} = useWeightLog();
	const {
		data: nutritionData,
		refetch: refetchNutrition,
		loading: loadingNutrition,
		error: errorNutrition,
	} = useNutrition();
	const {
		data: workoutData,
		refetch: refetchWorkouts,
		loading: loadingWorkouts,
		error: errorWorkouts,
	} = useWorkouts();
	const {
		data: stepData,
		refetch: refetchSteps,
		loading: loadingSteps,
		error: errorSteps,
	} = useSteps();
	const { goals, loading: loadingProfile } = useUserProfile();
	const {
		data: prsData,
		refetch: refetchPRs,
		loading: loadingPRs,
		error: errorPRs,
	} = usePRs();
	const { unit, toDisplay } = useWeightUnit();

	// PRs only drive the PR badges, so the page doesn't wait for them.
	const isLoading =
		loadingWeight ||
		loadingNutrition ||
		loadingWorkouts ||
		loadingSteps ||
		loadingProfile;
	const failedLoads = [
		[errorWeight, refetchWeight],
		[errorNutrition, refetchNutrition],
		[errorWorkouts, refetchWorkouts],
		[errorSteps, refetchSteps],
		[errorPRs, refetchPRs],
	].filter(([error]) => error);

	function retryFailedLoads() {
		failedLoads.forEach(([, refetch]) => refetch());
	}

	const [modal, setModal] = useState(null);
	const [editingEntry, setEditingEntry] = useState(null);
	const [editExercise, setEditExercise] = useState(null);
	const [appendBlankExercise, setAppendBlankExercise] = useState(false);
	const [workoutMenuOpen, setWorkoutMenuOpen] = useState(false);
	const [nutritionMenuOpen, setNutritionMenuOpen] = useState(false);
	const deleteWithUndo = useDeleteWithUndo();
	const workoutLongPress = useLongPress(() => setWorkoutMenuOpen(true));
	const nutritionLongPress = useLongPress(() => setNutritionMenuOpen(true));

	const todayWeightEntry = weightData.find((w) => w.logDate === TODAY);
	const todayWorkoutSessions = workoutData.filter(
		(w) => w.sessionDate === TODAY,
	);
	const todayWorkoutEntry = mergeWorkoutSessions(todayWorkoutSessions);
	const editableWorkoutSession = todayWorkoutSessions[0] ?? null;
	const hasSingleWorkoutSession = todayWorkoutSessions.length === 1;
	const todayNutritionEntry = nutritionData.find((n) => n.logDate === TODAY);
	const todayStepEntry = stepData.find((s) => s.logDate === TODAY);
	const totals = todayTotals({
		today: TODAY,
		nutritionEntry: todayNutritionEntry,
		stepEntry: todayStepEntry,
		goals,
	});

	const [editingSteps, setEditingSteps] = useState(false);
	const [stepsValue, setStepsValue] = useState("");
	const [stepsSaving, setStepsSaving] = useState(false);
	const [dayTypeSaving, setDayTypeSaving] = useState(false);

	const {
		renamingSession,
		setRenamingSession,
		renameValue,
		setRenameValue,
		renameSaving,
		submitRename,
		saveSteps,
		getOrCreateNutritionLogId,
	} = useDayActions({
		date: TODAY,
		nutritionEntry: todayNutritionEntry,
		workoutEntry: todayWorkoutEntry,
		stepEntry: todayStepEntry,
		onRefetchN: refetchNutrition,
		onRefetchWo: refetchWorkouts,
		onRefetchS: refetchSteps,
	});

	const exerciseGroups = todayWorkoutEntry?.exerciseSets?.length
		? groupByExercise(todayWorkoutEntry.exerciseSets)
		: [];

	// PR comparison: lexicographic (weight, setCount, maxRepsInSet). Higher is better.
	// Returns >0 if a beats b, <0 if a loses to b, 0 if tied.
	function comparePRTuple(a, b) {
		if (a.weight !== b.weight) return a.weight - b.weight;
		if (a.setCount !== b.setCount) return a.setCount - b.setCount;
		return a.maxRepsInSet - b.maxRepsInSet;
	}

	function tupleForGroup(g) {
		return {
			weight: g.weight,
			setCount: g.sets.length,
			maxRepsInSet: g.sets.reduce((m, s) => Math.max(m, s.reps ?? 0), 0),
		};
	}

	const prMap = Object.fromEntries(
		(prsData ?? []).map((pr) => [
			pr.exerciseName,
			{
				weight: parseFloat(pr.maxWeightLbs),
				setCount: pr.setCount ?? 0,
				maxRepsInSet: pr.maxRepsInSet ?? 0,
			},
		]),
	);

	// Find today's best tuple per exercise (across its weight-groups).
	const todayBestByExercise = {};
	for (const g of exerciseGroups) {
		const tuple = tupleForGroup(g);
		const current = todayBestByExercise[g.name];
		if (current == null || comparePRTuple(tuple, current) > 0) {
			todayBestByExercise[g.name] = tuple;
		}
	}

	function refreshWorkouts() {
		refetchWorkouts();
		refetchPRs();
	}

	function closeModal() {
		setModal(null);
		setEditingEntry(null);
		setAppendBlankExercise(false);
	}

	function openWorkoutModal({ appendBlank = false } = {}) {
		setAppendBlankExercise(appendBlank);
		setModal("workout");
	}

	async function toggleDayType() {
		if (dayTypeSaving) return;
		setDayTypeSaving(true);
		const current = todayNutritionEntry?.dayType ?? "training";
		const next = current === "training" ? "rest" : "training";
		try {
			await api.post("/nutrition", {
				logDate: TODAY,
				dayType: next,
			});
			refetchNutrition();
		} catch (err) {
			console.warn("toggleDayType failed:", err);
		} finally {
			setDayTypeSaving(false);
		}
	}

	async function commitSteps() {
		if (stepsSaving) return;
		setStepsSaving(true);
		try {
			await saveSteps(stepsValue || null);
			setEditingSteps(false);
		} finally {
			setStepsSaving(false);
		}
	}

	if (isLoading) {
		return (
			<div className="today-page">
				<div className="today-page-header">
					<span className="today-title">Today</span>
					<span className="today-date muted">{formatDayLabel(TODAY)}</span>
				</div>
				<div className="loading-state">Loading your daily stats…</div>
			</div>
		);
	}

	return (
		<div className="today-page">
			{failedLoads.length > 0 && (
				<div className="notice error today-load-error">
					<span>Couldn't load some of today's data.</span>
					<button className="btn btn-sm" onClick={retryFailedLoads}>
						Retry
					</button>
				</div>
			)}
			<div className="today-page-header">
				<span className="today-title">Today</span>
				<span className="today-date muted">{formatDayLabel(TODAY)}</span>
				{(() => {
					const dayType = todayNutritionEntry?.dayType ?? "training";
					const other = dayType === "training" ? "rest" : "training";
					return (
						<button
							className="today-day-type-toggle"
							onClick={toggleDayType}
							disabled={dayTypeSaving || Boolean(errorNutrition)}
							aria-label={`${dayType} day, switch to ${other} day`}
							title={`Switch to ${other} day`}
						>
							{dayType} day
							<ArrowLeftRight size={12} aria-hidden="true" />
						</button>
					);
				})()}
			</div>

			<DailyProgressBar
				caloriesCurrent={totals.calories}
				caloriesGoal={totals.calorieGoal}
				proteinCurrent={totals.protein}
				proteinGoal={totals.proteinGoal}
				stepsCurrent={totals.steps}
				stepsGoal={totals.stepsGoal}
			/>

			<div className="weekly-content-layout">
				<div className="weekly-main-col">
					{/* WEIGHT + STEPS: one row each — tap to edit, swipe to delete */}
					<div className="section-box today-daily-rows">
						{errorWeight ? (
							<div className="today-row">
								<DataRow label="Weight" value="Not loaded." />
							</div>
						) : todayWeightEntry ? (
							<SwipeRow
								label="Weight"
								openLabel="Edit weight"
								className="today-row"
								onOpen={() => {
									setEditingEntry(todayWeightEntry);
									setModal("weight");
								}}
								onDelete={() =>
									deleteWithUndo({
										remove: () => api.delete(`/weight/${todayWeightEntry.id}`),
										message: "Weight deleted",
										refresh: refetchWeight,
									})
								}
							>
								<DataRow
									label="Weight"
									value={toDisplay(todayWeightEntry.weightLbs) + " " + unit}
								/>
							</SwipeRow>
						) : (
							<button
								className="today-row today-row-add"
								aria-label="+ Add weight"
								onClick={() => {
									setEditingEntry(null);
									setModal("weight");
								}}
							>
								<span className="today-data-label">Weight</span>
								<span className="today-row-add-label">+ Add</span>
							</button>
						)}

						{errorSteps ? (
							<div className="today-row">
								<DataRow label="Steps" value="Not loaded." />
							</div>
						) : editingSteps ? (
							<div className="today-row today-steps-edit">
								<input
									className="modal-input"
									type="number"
									min="0"
									placeholder="Steps"
									aria-label="Steps"
									value={stepsValue}
									disabled={stepsSaving}
									onChange={(e) => setStepsValue(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") commitSteps();
										if (e.key === "Escape") setEditingSteps(false);
									}}
									autoFocus
								/>
								<button
									className="btn btn-sm btn-primary"
									onClick={commitSteps}
									disabled={stepsSaving}
								>
									{stepsSaving ? "Saving…" : "Save"}
								</button>
								<button
									className="btn btn-sm"
									onClick={() => setEditingSteps(false)}
									disabled={stepsSaving}
								>
									&times;
								</button>
							</div>
						) : todayStepEntry ? (
							<SwipeRow
								label="Steps"
								openLabel="Edit steps"
								className="today-row"
								onOpen={() => {
									setStepsValue(String(todayStepEntry.steps));
									setEditingSteps(true);
								}}
								onDelete={() =>
									deleteWithUndo({
										remove: () => api.delete(`/steps/${todayStepEntry.id}`),
										message: "Steps deleted",
										refresh: refetchSteps,
									})
								}
							>
								<DataRow
									label="Steps"
									value={todayStepEntry.steps.toLocaleString()}
								/>
							</SwipeRow>
						) : (
							<button
								className="today-row today-row-add"
								aria-label="+ Add steps"
								onClick={() => {
									setStepsValue("");
									setEditingSteps(true);
								}}
							>
								<span className="today-data-label">Steps</span>
								<span className="today-row-add-label">+ Add</span>
							</button>
						)}
					</div>

					{/* WORKOUT */}
					<div className="section-box">
						<div
							className="section-header"
							{...(todayWorkoutEntry && workoutLongPress)}
						>
							<span className="section-title">
								Workout
								{todayWorkoutEntry?.sessionName && (
									<span className="workout-session-name">
										{todayWorkoutEntry.sessionName}
									</span>
								)}
							</span>
							<div className="btn-actions">
								{renamingSession ? (
									<>
										<input
											className="modal-input rename-session-input"
											type="text"
											placeholder="Session name"
											aria-label="Session name"
											value={renameValue}
											disabled={renameSaving}
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
											disabled={renameSaving}
										>
											{renameSaving ? "Saving…" : "Save"}
										</button>
										<button
											className="btn btn-sm"
											onClick={() => setRenamingSession(false)}
											disabled={renameSaving}
										>
											&times;
										</button>
									</>
								) : todayWorkoutEntry ? (
									<MoreMenu
										label="More actions for workout"
										open={workoutMenuOpen}
										onOpenChange={setWorkoutMenuOpen}
										items={[
											{
												label: "Rename",
												onSelect: () => {
													setRenameValue(todayWorkoutEntry.sessionName ?? "");
													setRenamingSession(true);
												},
											},
											{
												label: "Edit workout",
												onSelect: () => openWorkoutModal(),
												hidden: !hasSingleWorkoutSession,
											},
											{
												label: "Delete workout",
												destructive: true,
												onSelect: () =>
													deleteWithUndo({
														remove: () =>
															api.delete(`/workouts/${todayWorkoutEntry.id}`),
														message: "Workout deleted",
														refresh: refreshWorkouts,
													}),
											},
										]}
									/>
								) : (
									!errorWorkouts && (
										<button
											className="btn btn-sm btn-primary"
											onClick={() => openWorkoutModal()}
										>
											Start Workout
										</button>
									)
								)}
							</div>
						</div>
						<div className="section-body">
							{todayWorkoutEntry ? (
								exerciseGroups.length > 0 ? (
									<div className="exercise-cards">
										{exerciseGroups.map((g) => {
											const groupTuple = tupleForGroup(g);
											const todayBest = todayBestByExercise[g.name];
											const allTimePR = prMap[g.name];
											const isBestOfDay =
												comparePRTuple(groupTuple, todayBest) === 0;
											const beatsAllTime =
												allTimePR == null ||
												comparePRTuple(todayBest, allTimePR) >= 0;
											// No badges until PRs arrive, or every lift would look like one.
											const isPR = !loadingPRs && isBestOfDay && beatsAllTime;
											const sessionId =
												g.sets[0]._sessionId ?? todayWorkoutEntry.id;
											return (
												<SwipeRow
													key={`${g.name}-${g.weight}`}
													label={g.name}
													openLabel={`Edit ${g.name}`}
													className="exercise-swipe-row"
													onOpen={() =>
														setEditExercise({
															sessionId,
															name: g.name,
															sets: g.sets,
														})
													}
													onDelete={() =>
														deleteWithUndo({
															remove: () =>
																api.delete(`/workouts/${sessionId}/exercises`, {
																	params: { name: g.name },
																}),
															message: `${g.name} deleted`,
															refresh: refreshWorkouts,
														})
													}
												>
													<ExerciseCard
														name={g.name}
														weight={g.weight}
														sets={g.sets}
														isPR={isPR}
													/>
												</SwipeRow>
											);
										})}
										{editableWorkoutSession && (
											<button
												className="today-add-exercise-row"
												onClick={() => openWorkoutModal({ appendBlank: true })}
											>
												+ Add another exercise
											</button>
										)}
									</div>
								) : (
									<div className="today-workout-empty">
										<span className="muted">
											Session logged. No exercises yet.
										</span>
										{editableWorkoutSession && (
											<button
												className="btn btn-sm btn-primary"
												onClick={() => openWorkoutModal({ appendBlank: true })}
											>
												+ Add exercise
											</button>
										)}
									</div>
								)
							) : (
								<span className="muted">
									{errorWorkouts ? "Not loaded." : "No entry for today."}
								</span>
							)}
						</div>
					</div>

					{/* NUTRITION */}
					<div className="section-box">
						<div
							className="section-header"
							{...(todayNutritionEntry && nutritionLongPress)}
						>
							<span className="section-title">Nutrition</span>
							<div className="btn-actions">
								{todayNutritionEntry && (
									<MoreMenu
										label="More actions for nutrition"
										open={nutritionMenuOpen}
										onOpenChange={setNutritionMenuOpen}
										items={[
											{
												label: "Edit day",
												onSelect: () => {
													setEditingEntry(todayNutritionEntry);
													setModal("dayinfo");
												},
											},
											{
												label: "Delete nutrition log",
												destructive: true,
												onSelect: () =>
													deleteWithUndo({
														remove: () =>
															api.delete(
																`/nutrition/${todayNutritionEntry.id}`,
															),
														message: "Nutrition log deleted",
														refresh: refetchNutrition,
													}),
											},
										]}
									/>
								)}
							</div>
						</div>
						<div className="section-body">
							{errorNutrition ? (
								<span className="muted">Not loaded.</span>
							) : (
								<MealCards
									nutritionEntry={todayNutritionEntry ?? null}
									nutritionData={nutritionData}
									getOrCreateNutritionLogId={getOrCreateNutritionLogId}
									onSaved={refetchNutrition}
								/>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Modals */}
			{modal === "weight" && (
				<WeightModal
					prefillDate={TODAY}
					existing={editingEntry}
					onClose={closeModal}
					onSaved={refetchWeight}
				/>
			)}
			{modal === "workout" && (
				<WorkoutBuilderModal
					prefillDate={TODAY}
					existingSession={todayWorkoutEntry ? editableWorkoutSession : null}
					appendBlankExercise={appendBlankExercise}
					onClose={closeModal}
					onSaved={() => {
						refetchWorkouts();
						refetchPRs();
					}}
				/>
			)}
			{modal === "dayinfo" && (
				<DayInfoModal
					prefillDate={TODAY}
					existing={editingEntry}
					onClose={closeModal}
					onSaved={refetchNutrition}
				/>
			)}
			{editExercise && (
				<EditExerciseModal
					sessionId={editExercise.sessionId}
					exerciseName={editExercise.name}
					exerciseSets={editExercise.sets}
					onClose={() => setEditExercise(null)}
					onSaved={refetchWorkouts}
				/>
			)}
		</div>
	);
}
