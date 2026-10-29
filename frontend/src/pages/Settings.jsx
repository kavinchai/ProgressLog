import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import Modal from "../components/Modal";
import useUserProfile from "../hooks/useUserProfile";
import useAuthStore from "../store/authStore";
import useWeightUnit from "../hooks/useWeightUnit";
import useWeightLog from "../hooks/useWeightLog";
import useNutrition from "../hooks/useNutrition";
import useWorkouts from "../hooks/useWorkouts";
import useSteps from "../hooks/useSteps";
import usePRs from "../hooks/usePRs";
import useTheme from "../hooks/useTheme";
import useMediaQuery, { MOBILE_QUERY } from "../hooks/useMediaQuery";
import { buildDayRows } from "../utils/stats";
import { groupByExercise } from "../utils/workout";
import { formatDateShort as formatDate } from "../utils/date";
import api from "../api";
import "./Settings.css";

const MIN_PASSWORD = 6;

// ── Export / import helpers ─────────────────────────────────────────────────

function buildExportData({ weightData, nutritionData, workoutData, stepData }) {
	const allDates = [
		...new Set([
			...weightData.map((x) => x.logDate),
			...nutritionData.map((x) => x.logDate),
			...workoutData.map((x) => x.sessionDate),
			...stepData.map((x) => x.logDate),
		]),
	].sort((a, b) => b.localeCompare(a));

	const rows = buildDayRows(
		allDates,
		weightData,
		nutritionData,
		workoutData,
		stepData,
	);

	const statsData = rows.map((row) => ({
		Date: formatDate(row.date),
		Weight: row.weight != null ? row.weight : "",
		Calories: row.calories != null ? row.calories : "",
		Protein: row.protein != null ? row.protein : "",
		Steps: row.steps != null ? row.steps : "",
		Workout: row.workout ?? "",
	}));

	const workoutRows = [];
	const cardioRows = [];

	for (const row of rows) {
		if (!row.workoutEntry?.exerciseSets?.length) continue;
		const allSets = row.workoutEntry.exerciseSets;

		const strengthSets = allSets.filter(
			(s) => s.distanceMiles == null && s.durationSeconds == null,
		);
		const cardioSets = allSets.filter(
			(s) => s.distanceMiles != null || s.durationSeconds != null,
		);

		const groups = groupByExercise(strengthSets);
		for (const g of groups) {
			const exportRow = {
				Date: formatDate(row.date),
				Exercise: g.name,
				Weight: g.weight,
			};
			for (const s of g.sets) {
				exportRow[`Set ${s.setNumber}`] = s.reps != null ? s.reps : "";
			}
			workoutRows.push(exportRow);
		}

		for (const s of cardioSets) {
			cardioRows.push({
				Date: formatDate(row.date),
				Exercise: s.exerciseName,
				Set: s.setNumber,
				"Distance (mi)":
					s.distanceMiles != null ? parseFloat(s.distanceMiles) : "",
				"Duration (sec)": s.durationSeconds != null ? s.durationSeconds : "",
			});
		}
	}

	const maxSets = workoutRows.reduce((max, row) => {
		const nums = Object.keys(row)
			.filter((k) => k.startsWith("Set "))
			.map((k) => parseInt(k.replace("Set ", "")));
		return Math.max(max, ...nums, 0);
	}, 0);
	const setHeaders = Array.from({ length: maxSets }, (_, i) => `Set ${i + 1}`);
	const normalizedWorkoutRows = workoutRows.map((row) => {
		const normalized = {
			Date: row.Date,
			Exercise: row.Exercise,
			Weight: row.Weight,
		};
		for (const h of setHeaders) normalized[h] = row[h] ?? "";
		return normalized;
	});

	// Build nutrition rows (one per meal) from the raw nutritionData hook
	const nutritionRows = [];
	for (const entry of nutritionData) {
		if (!entry.meals?.length) continue;
		for (const meal of entry.meals) {
			const dayType =
				(entry.dayType ?? "training").charAt(0).toUpperCase() +
				(entry.dayType ?? "training").slice(1);
			nutritionRows.push({
				Date: formatDate(entry.logDate),
				"Day Type": dayType,
				Label: meal.mealLabel ?? "",
				Meal: meal.mealName ?? "",
				Calories: meal.calories ?? "",
				Protein: meal.proteinGrams ?? "",
			});
		}
	}

	return { statsData, normalizedWorkoutRows, cardioRows, nutritionRows };
}

function exportXlsx(data) {
	const { statsData, normalizedWorkoutRows, cardioRows, nutritionRows } =
		buildExportData(data);
	const ws1 = XLSX.utils.json_to_sheet(statsData);
	const ws2 = XLSX.utils.json_to_sheet(
		normalizedWorkoutRows.length
			? normalizedWorkoutRows
			: [{ Date: "", Exercise: "", Weight: "" }],
	);
	const ws3 = XLSX.utils.json_to_sheet(
		cardioRows.length
			? cardioRows
			: [
					{
						Date: "",
						Exercise: "",
						Set: "",
						"Distance (mi)": "",
						"Duration (sec)": "",
					},
				],
	);
	const ws4 = XLSX.utils.json_to_sheet(
		nutritionRows.length
			? nutritionRows
			: [
					{
						Date: "",
						"Day Type": "",
						Label: "",
						Meal: "",
						Calories: "",
						Protein: "",
					},
				],
	);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws1, "Total Stats");
	XLSX.utils.book_append_sheet(wb, ws2, "Workouts");
	XLSX.utils.book_append_sheet(wb, ws3, "Cardio");
	XLSX.utils.book_append_sheet(wb, ws4, "Nutrition");
	XLSX.writeFile(wb, "total-stats.xlsx");
}

function exportJson(data) {
	const { statsData, normalizedWorkoutRows, cardioRows, nutritionRows } =
		buildExportData(data);
	const json = JSON.stringify(
		{
			totalStats: statsData,
			workouts: normalizedWorkoutRows,
			cardio: cardioRows,
			nutrition: nutritionRows,
		},
		null,
		2,
	);
	const blob = new Blob([json], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = "total-stats.json";
	a.click();
	URL.revokeObjectURL(url);
}

const IMPORT_TYPES = [
	{ key: "weight", label: "Weight" },
	{ key: "nutrition", label: "Meals" },
	{ key: "workouts", label: "Workouts" },
	{ key: "steps", label: "Steps" },
];

// ── Building blocks ─────────────────────────────────────────────────────────

function Group({ title, children }) {
	const id = `settings-group-${title.toLowerCase()}`;
	return (
		<section className="settings-group" aria-labelledby={id}>
			<h2 id={id} className="settings-group-title">
				{title}
			</h2>
			<div className="settings-list">{children}</div>
		</section>
	);
}

function Row({ label, hint, children }) {
	return (
		<div className="settings-row">
			<span className="settings-row-text">
				<span className="settings-row-label">{label}</span>
				{hint && <span className="settings-row-hint">{hint}</span>}
			</span>
			<span className="settings-row-control">{children}</span>
		</div>
	);
}

// A row whose form opens under it on desktop, or in a bottom sheet on phones.
function EditRow({ label, value, saved, open, disabled, onToggle, children }) {
	const isMobile = useMediaQuery(MOBILE_QUERY);
	return (
		<div className={"settings-edit" + (open ? " settings-edit-open" : "")}>
			<button
				type="button"
				className="settings-row settings-row-button"
				aria-expanded={open}
				disabled={disabled}
				onClick={onToggle}
			>
				<span className="settings-row-main">
					<span className="settings-row-label">{label}</span>
					{saved && <span className="settings-saved">Saved!</span>}
					<span className="settings-value">{value}</span>
				</span>
				<span className="settings-chevron" aria-hidden="true">
					{open && !isMobile ? "⌃" : "›"}
				</span>
			</button>
			{open &&
				(isMobile ? (
					<Modal title={label} onClose={onToggle}>
						{children}
					</Modal>
				) : (
					<div className="settings-editor">{children}</div>
				))}
		</div>
	);
}

function Segmented({ label, options, value, onChange }) {
	return (
		<div className="settings-seg" role="group" aria-label={label}>
			{options.map((o) => (
				<button
					key={o.value}
					type="button"
					aria-pressed={value === o.value}
					className={value === o.value ? "on" : ""}
					onClick={() => onChange(o.value)}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}

function Switch({ ariaLabel, on, saving, onToggle }) {
	return (
		<>
			{saving && <span className="settings-saved">Saving…</span>}
			<span className="settings-value">{on ? "On" : "Off"}</span>
			<button
				type="button"
				className={"settings-switch" + (on ? " on" : "")}
				aria-label={ariaLabel}
				aria-pressed={on}
				disabled={saving}
				onClick={onToggle}
			/>
		</>
	);
}

function Field({ id, label, children }) {
	return (
		<div className="settings-field">
			<label htmlFor={id}>{label}</label>
			{children}
		</div>
	);
}

function FormActions({ submitLabel, busy, disabled, onCancel, children }) {
	return (
		<div className="settings-actions">
			<button
				className="btn btn-primary"
				type="submit"
				disabled={busy || disabled}
			>
				{busy ? "Saving..." : submitLabel}
			</button>
			<button className="btn" type="button" onClick={onCancel}>
				Cancel
			</button>
			{children}
		</div>
	);
}

const apiError = (err, fallback) => err.response?.data?.message ?? fallback;

// ── Forms ───────────────────────────────────────────────────────────────────

function GoalsForm({ goals, saving, error, saveGoals, onSaved, onCancel }) {
	const initial = {
		calorieTargetTraining: String(goals.calorieTargetTraining ?? ""),
		calorieTargetRest: String(goals.calorieTargetRest ?? ""),
		proteinTarget: String(goals.proteinTarget ?? ""),
	};
	const [form, setForm] = useState(initial);
	const dirty = Object.keys(initial).some((k) => form[k] !== initial[k]);

	async function handleSubmit(e) {
		e.preventDefault();
		try {
			await saveGoals({
				calorieTargetTraining: parseInt(form.calorieTargetTraining, 10),
				calorieTargetRest: parseInt(form.calorieTargetRest, 10),
				proteinTarget: parseInt(form.proteinTarget, 10),
			});
			onSaved();
		} catch {
			/* error shown via hook */
		}
	}

	const input = (name, label, unit) => (
		<Field id={name} label={label}>
			<span className="settings-suffix">
				<input
					id={name}
					name={name}
					type="number"
					min="1"
					className="settings-input"
					value={form[name]}
					onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
					required
				/>
				<span>{unit}</span>
			</span>
		</Field>
	);

	return (
		<form className="settings-form" onSubmit={handleSubmit}>
			<div className="settings-fields">
				{input("calorieTargetTraining", "Training day", "kcal")}
				{input("calorieTargetRest", "Rest day", "kcal")}
				{input("proteinTarget", "Daily protein", "g")}
			</div>
			<p className="settings-hint">
				Today uses the training or rest target based on the day type you pick.
			</p>
			{error && <p className="settings-error">{error}</p>}
			<FormActions
				submitLabel="Save goals"
				busy={saving}
				disabled={!dirty}
				onCancel={onCancel}
			>
				{dirty && <span className="settings-dirty">● Unsaved changes</span>}
			</FormActions>
		</form>
	);
}

function CurrentPassword({ value, onChange }) {
	return (
		<Field id="currentPassword" label="Current password">
			<input
				id="currentPassword"
				type="password"
				autoComplete="current-password"
				className="settings-input"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				required
			/>
		</Field>
	);
}

function UsernameForm({ onDone, onCancel }) {
	const login = useAuthStore((s) => s.login);
	const [newUsername, setNewUsername] = useState("");
	const [currentPassword, setCurrentPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);

	async function handleSubmit(e) {
		e.preventDefault();
		setError(null);
		setBusy(true);
		try {
			const res = await api.put("/profile/credentials", {
				currentPassword,
				newUsername: newUsername.trim(),
			});
			login(res.data.username);
			onDone();
		} catch (err) {
			setError(apiError(err, "Failed to change username."));
		} finally {
			setBusy(false);
		}
	}

	return (
		<form className="settings-form" onSubmit={handleSubmit}>
			<div className="settings-fields settings-fields-2">
				<Field id="newUsername" label="New username">
					<input
						id="newUsername"
						type="text"
						autoComplete="username"
						className="settings-input"
						value={newUsername}
						onChange={(e) => setNewUsername(e.target.value)}
						minLength={3}
						maxLength={50}
						required
					/>
				</Field>
				<CurrentPassword
					value={currentPassword}
					onChange={setCurrentPassword}
				/>
			</div>
			{error && <p className="settings-error">{error}</p>}
			<FormActions
				submitLabel="Save username"
				busy={busy}
				onCancel={onCancel}
			/>
		</form>
	);
}

function EmailForm({ currentEmail, onDone, onCancel }) {
	const [email, setEmail] = useState("");
	const [currentPassword, setCurrentPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);

	async function handleSubmit(e) {
		e.preventDefault();
		setError(null);
		const newEmail = email.trim();
		if (newEmail === currentEmail) {
			setError("That's already your email.");
			return;
		}
		setBusy(true);
		try {
			await api.post("/profile/verify-password", { password: currentPassword });
			await api.put("/profile/email", { email: newEmail });
			onDone(newEmail);
		} catch (err) {
			setError(apiError(err, "Failed to change email."));
		} finally {
			setBusy(false);
		}
	}

	return (
		<form className="settings-form" onSubmit={handleSubmit}>
			<div className="settings-fields settings-fields-2">
				<Field id="newEmail" label="New email">
					<input
						id="newEmail"
						type="email"
						autoComplete="email"
						className="settings-input"
						placeholder={currentEmail}
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>
				</Field>
				<CurrentPassword
					value={currentPassword}
					onChange={setCurrentPassword}
				/>
			</div>
			{error && <p className="settings-error">{error}</p>}
			<FormActions submitLabel="Save email" busy={busy} onCancel={onCancel} />
		</form>
	);
}

function PasswordForm({ onDone, onCancel }) {
	const [form, setForm] = useState({ current: "", next: "", confirm: "" });
	const [show, setShow] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);
	const type = show ? "text" : "password";
	const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

	async function handleSubmit(e) {
		e.preventDefault();
		setError(null);
		if (form.next.length < MIN_PASSWORD) {
			setError(`New password must be at least ${MIN_PASSWORD} characters.`);
			return;
		}
		if (form.next !== form.confirm) {
			setError("Passwords don't match.");
			return;
		}
		setBusy(true);
		try {
			await api.put("/profile/credentials", {
				currentPassword: form.current,
				newPassword: form.next,
			});
			onDone();
		} catch (err) {
			setError(apiError(err, "Failed to change password."));
		} finally {
			setBusy(false);
		}
	}

	return (
		<form className="settings-form" onSubmit={handleSubmit}>
			<div className="settings-fields">
				<Field id="currentPassword" label="Current password">
					<input
						id="currentPassword"
						type={type}
						autoComplete="current-password"
						className="settings-input"
						value={form.current}
						onChange={set("current")}
						required
					/>
				</Field>
				<Field id="newPassword" label="New password">
					<input
						id="newPassword"
						type={type}
						autoComplete="new-password"
						className="settings-input"
						value={form.next}
						onChange={set("next")}
						required
					/>
				</Field>
				<Field id="confirmPassword" label="Confirm new password">
					<input
						id="confirmPassword"
						type={type}
						autoComplete="new-password"
						className="settings-input"
						value={form.confirm}
						onChange={set("confirm")}
						required
					/>
				</Field>
			</div>
			<label className="settings-check">
				<input
					type="checkbox"
					checked={show}
					onChange={(e) => setShow(e.target.checked)}
				/>
				Show passwords
			</label>
			<p className="settings-hint">At least {MIN_PASSWORD} characters.</p>
			{error && <p className="settings-error">{error}</p>}
			<FormActions
				submitLabel="Update password"
				busy={busy}
				onCancel={onCancel}
			/>
		</form>
	);
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function Settings() {
	const navigate = useNavigate();
	const { goals, loading, saving, error, saveGoals } = useUserProfile();
	const { unit, toggleUnit, toDisplay } = useWeightUnit();
	const [, , themeMode, setThemeMode] = useTheme();
	const username = useAuthStore((s) => s.username);
	const clearAuth = useAuthStore((s) => s.logout);

	// ── Data hooks (export/import, privacy preview) ──────────────────────────
	const { data: weightData, refetch: refetchWeight } = useWeightLog();
	const { data: nutritionData, refetch: refetchNutrition } = useNutrition();
	const { data: workoutData, refetch: refetchWorkouts } = useWorkouts();
	const { data: stepData, refetch: refetchSteps } = useSteps();
	const { data: prs } = usePRs();
	const exportData = { weightData, nutritionData, workoutData, stepData };
	const hasData =
		weightData.length > 0 ||
		nutritionData.length > 0 ||
		workoutData.length > 0 ||
		stepData.length > 0;

	// One editable row open at a time; "Saved!" shows on the row just saved.
	const [openRow, setOpenRow] = useState(null);
	const [savedRow, setSavedRow] = useState(null);
	const [currentEmail, setCurrentEmail] = useState("");

	// ── Import state ─────────────────────────────────────────────────────────
	const [importResult, setImportResult] = useState(null);
	const [importing, setImporting] = useState(false);
	const fileInputRef = useRef(null);

	// ── Privacy state ────────────────────────────────────────────────────────
	const [privacy, setPrivacy] = useState({
		shareData: false,
		shareCalendar: false,
	});
	const [privacyLoading, setPrivacyLoading] = useState(true);
	const [privacySaving, setPrivacySaving] = useState(null);
	const [privacyError, setPrivacyError] = useState(null);

	useEffect(() => {
		api
			.get("/profile/email")
			.then((res) => setCurrentEmail(res.data.email ?? ""))
			.catch(() => {});
	}, []);

	useEffect(() => {
		api
			.get("/profile/privacy")
			.then((res) =>
				setPrivacy({
					shareData: Boolean(res.data.shareData),
					shareCalendar: Boolean(res.data.shareCalendar),
				}),
			)
			.catch(() => setPrivacyError("Could not load privacy setting."))
			.finally(() => setPrivacyLoading(false));
	}, []);

	useEffect(() => {
		if (!savedRow) return;
		const t = setTimeout(() => setSavedRow(null), 3000);
		return () => clearTimeout(t);
	}, [savedRow]);

	function toggleRow(row) {
		setSavedRow(null);
		setOpenRow((current) => (current === row ? null : row));
	}

	function finishRow(row) {
		setOpenRow(null);
		setSavedRow(row);
	}

	async function updatePrivacy(key) {
		const next = { ...privacy, [key]: !privacy[key] };
		setPrivacySaving(key);
		setPrivacyError(null);
		setPrivacy(next); // optimistic
		try {
			await api.put("/profile/privacy", next);
		} catch (err) {
			setPrivacy(privacy); // revert
			setPrivacyError(apiError(err, "Failed to update privacy."));
		} finally {
			setPrivacySaving(null);
		}
	}

	async function handleImportJson(e) {
		const file = e.target.files?.[0];
		if (!fileInputRef.current) return;
		fileInputRef.current.value = "";
		if (!file) return;

		setImporting(true);
		setImportResult(null);
		try {
			const payload = JSON.parse(await file.text());
			const res = await api.post("/import", payload);
			setImportResult({ ok: true, fileName: file.name, counts: res.data });
			refetchWeight();
			refetchNutrition();
			refetchWorkouts();
			refetchSteps();
		} catch {
			setImportResult({ ok: false });
		} finally {
			setImporting(false);
		}
	}

	function logout() {
		api.post("/auth/logout").catch(() => {});
		clearAuth();
	}

	const goalsSummary = loading
		? "Loading…"
		: `${goals.calorieTargetTraining.toLocaleString()} / ${goals.calorieTargetRest.toLocaleString()} kcal · ${goals.proteinTarget} g`;

	const topLifts = [...(prs ?? [])]
		.sort((a, b) => Number(b.maxWeightLbs) - Number(a.maxWeightLbs))
		.slice(0, 2)
		.map(
			(p) => `${p.exerciseName} ${toDisplay(Number(p.maxWeightLbs))} ${unit}`,
		);
	const leaderboardHint = topLifts.length
		? `Others see: ${[username, ...topLifts].join(" · ")}`
		: "Your username, exercise names and best lifts";

	return (
		<div className="settings-page">
			<h1 className="settings-title">Settings</h1>

			<Group title="Goals">
				<EditRow
					label="Calorie & protein goals"
					value={goalsSummary}
					saved={savedRow === "goals"}
					open={openRow === "goals"}
					disabled={loading}
					onToggle={() => toggleRow("goals")}
				>
					<GoalsForm
						goals={goals}
						saving={saving}
						error={error}
						saveGoals={saveGoals}
						onSaved={() => finishRow("goals")}
						onCancel={() => toggleRow("goals")}
					/>
				</EditRow>
			</Group>

			<Group title="Preferences">
				<Row label="Weight unit">
					<Segmented
						label="Weight unit"
						options={[
							{ value: "lbs", label: "lbs" },
							{ value: "kg", label: "kg" },
						]}
						value={unit}
						onChange={(next) => next !== unit && toggleUnit()}
					/>
				</Row>
				<Row label="Theme">
					<Segmented
						label="Theme"
						options={[
							{ value: "light", label: "Light" },
							{ value: "dark", label: "Dark" },
							{ value: "system", label: "System" },
						]}
						value={themeMode}
						onChange={setThemeMode}
					/>
				</Row>
			</Group>

			<Group title="Privacy">
				{privacyLoading ? (
					<Row label="Loading…" />
				) : (
					<>
						<Row label="Share data on leaderboard" hint={leaderboardHint}>
							<Switch
								ariaLabel="Toggle data sharing"
								on={privacy.shareData}
								saving={privacySaving === "shareData"}
								onToggle={() => updatePrivacy("shareData")}
							/>
						</Row>
						<Row
							label="Share on community calendar"
							hint="The days you trained"
						>
							<Switch
								ariaLabel="Toggle calendar sharing"
								on={privacy.shareCalendar}
								saving={privacySaving === "shareCalendar"}
								onToggle={() => updatePrivacy("shareCalendar")}
							/>
						</Row>
					</>
				)}
				{privacyError && (
					<p className="settings-error settings-row-note">{privacyError}</p>
				)}
			</Group>

			<Group title="Integrations">
				<button
					type="button"
					className="settings-row settings-row-button"
					onClick={() => navigate("/claude-setup")}
				>
					<span className="settings-row-label">Claude integration</span>
					<span className="settings-value">Set up</span>
					<span className="settings-chevron" aria-hidden="true">
						›
					</span>
				</button>
			</Group>

			<Group title="Data">
				<Row
					label="Export a backup"
					hint={hasData ? null : "Log some data to enable export."}
				>
					<button
						className="btn btn-sm"
						type="button"
						aria-label="Export as JSON"
						onClick={() => exportJson(exportData)}
						disabled={!hasData}
					>
						JSON
					</button>
					<button
						className="btn btn-sm"
						type="button"
						aria-label="Export as XLSX"
						onClick={() => exportXlsx(exportData)}
						disabled={!hasData}
					>
						XLSX
					</button>
				</Row>
				<Row
					label="Import a backup"
					hint="Restore a JSON export. Duplicates are skipped."
				>
					<button
						className="btn btn-sm"
						type="button"
						disabled={importing}
						onClick={() => fileInputRef.current?.click()}
					>
						{importing ? "Importing..." : "Choose JSON file"}
					</button>
					<input
						ref={fileInputRef}
						type="file"
						accept=".json"
						style={{ display: "none" }}
						onChange={handleImportJson}
					/>
				</Row>
				{importResult && !importResult.ok && (
					<p className="settings-error settings-row-note">
						Import failed — check file format
					</p>
				)}
				{importResult?.ok && (
					<div className="settings-row-note">
						<p className="settings-import-ok">
							✓ Import complete · {importResult.fileName}
						</p>
						<table className="settings-import-table">
							<thead>
								<tr>
									<th />
									{IMPORT_TYPES.map((t) => (
										<th key={t.key}>{t.label}</th>
									))}
								</tr>
							</thead>
							<tbody>
								{["Imported", "Skipped"].map((kind) => (
									<tr key={kind}>
										<th scope="row">{kind}</th>
										{IMPORT_TYPES.map((t) => (
											<td key={t.key}>
												{importResult.counts[`${t.key}${kind}`] ?? 0}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Group>

			<Group title="Account">
				<EditRow
					label="Username"
					value={username ?? "—"}
					saved={savedRow === "username"}
					open={openRow === "username"}
					onToggle={() => toggleRow("username")}
				>
					<UsernameForm
						onDone={() => finishRow("username")}
						onCancel={() => toggleRow("username")}
					/>
				</EditRow>
				<EditRow
					label="Email"
					value={currentEmail || "—"}
					saved={savedRow === "email"}
					open={openRow === "email"}
					onToggle={() => toggleRow("email")}
				>
					<EmailForm
						currentEmail={currentEmail}
						onDone={(newEmail) => {
							setCurrentEmail(newEmail);
							finishRow("email");
						}}
						onCancel={() => toggleRow("email")}
					/>
				</EditRow>
				<EditRow
					label="Password"
					value="••••••••"
					saved={savedRow === "password"}
					open={openRow === "password"}
					onToggle={() => toggleRow("password")}
				>
					<PasswordForm
						onDone={() => finishRow("password")}
						onCancel={() => toggleRow("password")}
					/>
				</EditRow>
				<button
					type="button"
					className="settings-row settings-row-button settings-logout"
					onClick={logout}
				>
					<span className="settings-row-label">Log out</span>
				</button>
			</Group>
		</div>
	);
}
