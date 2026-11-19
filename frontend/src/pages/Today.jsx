import { useState } from "react";
import { CirclePlus } from "lucide-react";
import { PageHeader, PullDownMenu } from "../components/ios/Ios";
import api from "../api";
import useWeightLog from "../hooks/useWeightLog";
import useNutrition from "../hooks/useNutrition";
import useWorkouts from "../hooks/useWorkouts";
import useSteps from "../hooks/useSteps";
import useUserProfile from "../hooks/useUserProfile";
import usePRs from "../hooks/usePRs";
import { useDayActions } from "../hooks/useDayActions";
import WeightModal from "../components/WeightModal";
import StepsModal from "../components/StepsModal";
import DayInfoModal from "../components/DayInfoModal";
import MealCards from "../components/MealCards";
import WorkoutBuilderModal from "../components/WorkoutBuilderModal";
import EditExerciseModal from "../components/EditExerciseModal";
import DailyProgressBar from "../components/DailyProgressBar";
import SwipeRow from "../components/SwipeRow";
import StatusRow, { AddRow } from "../components/StatusRow";
import ExerciseRow from "../components/ExerciseRow";
import MoreMenu from "../components/MoreMenu";
import useDeleteWithUndo from "../hooks/useDeleteWithUndo";
import useLongPress from "../hooks/useLongPress";
import { exerciseSummary, groupByExercise } from "../utils/workout";
import { mergeWorkoutSessions } from "../utils/stats";
import useWeightUnit from "../hooks/useWeightUnit";
import useToday from "../hooks/useToday";
import { todayTotals } from "../utils/widget";
import { formatDayLabel } from "../utils/date";
import "../pages/WeeklyStats.css";
import "./Today.css";

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

	const [dayTypeSaving, setDayTypeSaving] = useState(false);

	const {
		renamingSession,
		setRenamingSession,
		renameValue,
		setRenameValue,
		renameSaving,
		submitRename,
		getOrCreateNutritionLogId,
	} = useDayActions({
		date: TODAY,
		nutritionEntry: todayNutritionEntry,
		workoutEntry: todayWorkoutEntry,
		onRefetchN: refetchNutrition,
		onRefetchWo: refetchWorkouts,
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

	const dayType = todayNutritionEntry?.dayType ?? "training";

	if (isLoading) {
		return (
			<div className="today-page">
				<PageHeader title="Today" subtitle={formatDayLabel(TODAY)} />
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
			<PageHeader
				title="Today"
				subtitle={formatDayLabel(TODAY)}
				trailing={
					<PullDownMenu
						label="Day type"
						buttonLabel={dayType === "rest" ? "Rest day" : "Training day"}
						sections={[
							{
								options: [
									{ value: "training", label: "Training day" },
									{ value: "rest", label: "Rest day" },
								],
								value: dayType,
								onChange: (v) => {
									if (v !== dayType && !dayTypeSaving && !errorNutrition) {
										toggleDayType();
									}
								},
							},
						]}
					/>
				}
			/>

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
								<StatusRow status="empty" title="Weight" detail="Not loaded." />
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
								<StatusRow
									status="done"
									title="Weight"
									detail={toDisplay(todayWeightEntry.weightLbs) + " " + unit}
								/>
							</SwipeRow>
						) : (
							<AddRow
								title="Weight"
								label="+ Add weight"
								className="today-row"
								onClick={() => {
									setEditingEntry(null);
									setModal("weight");
								}}
							/>
						)}

						{errorSteps ? (
							<div className="today-row">
								<StatusRow status="empty" title="Steps" detail="Not loaded." />
							</div>
						) : todayStepEntry ? (
							<SwipeRow
								label="Steps"
								openLabel="Edit steps"
								className="today-row"
								onOpen={() => {
									setEditingEntry(todayStepEntry);
									setModal("steps");
								}}
								onDelete={() =>
									deleteWithUndo({
										remove: () => api.delete(`/steps/${todayStepEntry.id}`),
										message: "Steps deleted",
										refresh: refetchSteps,
									})
								}
							>
								<StatusRow
									status="done"
									title="Steps"
									detail={`${todayStepEntry.steps.toLocaleString()} steps`}
								/>
							</SwipeRow>
						) : (
							<AddRow
								title="Steps"
								label="+ Add steps"
								className="today-row"
								onClick={() => {
									setEditingEntry(null);
									setModal("steps");
								}}
							/>
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
									<>
										{exerciseGroups.length > 0 && (
											<span className="section-header-meta">
												{exerciseSummary(todayWorkoutEntry.exerciseSets)}
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
									</>
								) : null}
							</div>
						</div>
						{errorWorkouts ? (
							<div className="section-body">
								<span className="muted">Not loaded.</span>
							</div>
						) : !todayWorkoutEntry ? (
							<AddRow
								title="No workout yet"
								label="Start workout"
								action="+ Start"
								className="today-row"
								onClick={() => openWorkoutModal()}
							/>
						) : (
							<div className="status-rows">
								{exerciseGroups.length === 0 && (
									<div className="status-row-static">
										<StatusRow status="empty" title="No exercises yet" />
									</div>
								)}
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
											className="exercise-row"
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
											<ExerciseRow
												name={g.name}
												weight={g.weight}
												sets={g.sets}
												isPR={isPR}
											/>
										</SwipeRow>
									);
								})}
								{editableWorkoutSession && (
									<div className="status-rows-footer">
										<button
											type="button"
											className="status-add-chip"
											onClick={() => openWorkoutModal({ appendBlank: true })}
										>
											<CirclePlus size={20} aria-hidden="true" />
											Add exercise
										</button>
									</div>
								)}
							</div>
						)}
					</div>

					{/* NUTRITION */}
					<div className="section-box">
						<div
							className="section-header"
							{...(todayNutritionEntry && nutritionLongPress)}
						>
							<span className="section-title">Nutrition</span>
							<div className="btn-actions">
								{todayNutritionEntry?.meals?.length > 0 && (
									<span className="section-header-meta">
										{totals.calories.toLocaleString()} kcal · {totals.protein} g
									</span>
								)}
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
						{errorNutrition ? (
							<div className="section-body">
								<span className="muted">Not loaded.</span>
							</div>
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

			{/* Modals */}
			{modal === "weight" && (
				<WeightModal
					prefillDate={TODAY}
					existing={editingEntry}
					onClose={closeModal}
					onSaved={refetchWeight}
				/>
			)}
			{modal === "steps" && (
				<StepsModal
					prefillDate={TODAY}
					existing={editingEntry}
					onClose={closeModal}
					onSaved={refetchSteps}
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
