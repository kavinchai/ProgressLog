import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
	Apple,
	CalendarDays,
	Download,
	Flame,
	Footprints,
	Heart,
	KeyRound,
	Mail,
	Moon,
	Ruler,
	ScanFace,
	Sparkles,
	Trash2,
	Trophy,
	Upload,
	User,
} from "lucide-react";
import Modal from "../components/Modal";
import { PageHeader } from "../components/ios/Ios";
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
import { formatDateShort as formatDate, localDateStr } from "../utils/date";
import api from "../api";
import {
	connectHealth,
	isAutoStepsOn,
	isHealthConnected,
	isHealthSupported,
	lastHealthSync,
	setAutoSteps,
	syncHealth,
} from "../native/health";
import { isAppleSignInAvailable, signInWithApple } from "../native/appleSignIn";
import {
	biometryType,
	isLockOn,
	setLockOn,
	unlockWithBiometrics,
} from "../native/biometricLock";
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

	for (const row of rows) {
		if (!row.workoutEntry?.exerciseSets?.length) continue;

		const groups = groupByExercise(row.workoutEntry.exerciseSets);
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
				Restaurant: meal.restaurant ?? "",
				Calories: meal.calories ?? "",
				Protein: meal.proteinGrams ?? "",
			});
		}
	}

	return { statsData, normalizedWorkoutRows, nutritionRows };
}

// xlsx is large, so it's only downloaded when someone actually exports.
async function exportXlsx(data) {
	const XLSX = await import("xlsx");
	const { statsData, normalizedWorkoutRows, nutritionRows } =
		buildExportData(data);
	const ws1 = XLSX.utils.json_to_sheet(statsData);
	const ws2 = XLSX.utils.json_to_sheet(
		normalizedWorkoutRows.length
			? normalizedWorkoutRows
			: [{ Date: "", Exercise: "", Weight: "" }],
	);
	const ws3 = XLSX.utils.json_to_sheet(
		nutritionRows.length
			? nutritionRows
			: [
					{
						Date: "",
						"Day Type": "",
						Label: "",
						Meal: "",
						Restaurant: "",
						Calories: "",
						Protein: "",
					},
				],
	);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws1, "Total Stats");
	XLSX.utils.book_append_sheet(wb, ws2, "Workouts");
	XLSX.utils.book_append_sheet(wb, ws3, "Nutrition");
	XLSX.writeFile(wb, "total-stats.xlsx");
}

function exportJson(data) {
	const { statsData, normalizedWorkoutRows, nutritionRows } =
		buildExportData(data);
	const json = JSON.stringify(
		{
			totalStats: statsData,
			workouts: normalizedWorkoutRows,
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

// iOS Settings-style colored tile in front of a row's label.
function RowIcon({ icon: Icon, color }) {
	if (!Icon) return null;
	return (
		<span className="settings-icon" style={{ background: color }} aria-hidden="true">
			<Icon size={17} strokeWidth={2.2} />
		</span>
	);
}

function Row({ label, hint, icon, iconColor, children }) {
	return (
		<div className="settings-row">
			<RowIcon icon={icon} color={iconColor} />
			<span className="settings-row-text">
				<span className="settings-row-label">{label}</span>
				{hint && <span className="settings-row-hint">{hint}</span>}
			</span>
			<span className="settings-row-control">{children}</span>
		</div>
	);
}

// A row whose form opens under it on desktop, or in a bottom sheet on phones.
function EditRow({
	label,
	value,
	saved,
	open,
	disabled,
	onToggle,
	icon,
	iconColor,
	children,
}) {
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
				<RowIcon icon={icon} color={iconColor} />
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

const DEFAULT_STEPS_GOAL = 10000;

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
		if (saving) return;
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

function StepsGoalForm({ goals, saving, error, saveGoals, onSaved, onCancel }) {
	const initial = String(goals.stepsTarget ?? DEFAULT_STEPS_GOAL);
	const [value, setValue] = useState(initial);
	const dirty = value !== initial;

	async function handleSubmit(e) {
		e.preventDefault();
		if (saving) return;
		try {
			await saveGoals({ ...goals, stepsTarget: parseInt(value, 10) });
			onSaved();
		} catch {
			/* error shown via hook */
		}
	}

	return (
		<form className="settings-form" onSubmit={handleSubmit}>
			<div className="settings-fields">
				<Field id="stepsTarget" label="Steps per day">
					<span className="settings-suffix">
						<input
							id="stepsTarget"
							name="stepsTarget"
							type="number"
							min="1"
							className="settings-input"
							value={value}
							onChange={(e) => setValue(e.target.value)}
							required
						/>
						<span>steps</span>
					</span>
				</Field>
			</div>
			{error && <p className="settings-error">{error}</p>}
			<FormActions
				submitLabel="Save steps goal"
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

// Accounts created with Apple have no password until they set one, so the
// account forms skip "Current password" for them (hasPassword false).
function UsernameForm({ hasPassword, onDone, onCancel }) {
	const login = useAuthStore((s) => s.login);
	const [newUsername, setNewUsername] = useState("");
	const [currentPassword, setCurrentPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);

	async function handleSubmit(e) {
		e.preventDefault();
		if (busy) return;
		setError(null);
		setBusy(true);
		try {
			const res = await api.put(
				"/profile/credentials",
				hasPassword
					? { currentPassword, newUsername: newUsername.trim() }
					: { newUsername: newUsername.trim() },
			);
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
						autoCapitalize="none"
						autoCorrect="off"
						spellCheck={false}
						className="settings-input"
						value={newUsername}
						onChange={(e) => setNewUsername(e.target.value)}
						minLength={3}
						maxLength={50}
						required
					/>
				</Field>
				{hasPassword && (
					<CurrentPassword
						value={currentPassword}
						onChange={setCurrentPassword}
					/>
				)}
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

function EmailForm({ currentEmail, hasPassword, onDone, onCancel }) {
	const [email, setEmail] = useState("");
	const [currentPassword, setCurrentPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);

	async function handleSubmit(e) {
		e.preventDefault();
		if (busy) return;
		setError(null);
		const newEmail = email.trim();
		if (newEmail === currentEmail) {
			setError("That's already your email.");
			return;
		}
		setBusy(true);
		try {
			if (hasPassword) {
				await api.post("/profile/verify-password", {
					password: currentPassword,
				});
			}
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
				{hasPassword && (
					<CurrentPassword
						value={currentPassword}
						onChange={setCurrentPassword}
					/>
				)}
			</div>
			{error && <p className="settings-error">{error}</p>}
			<FormActions submitLabel="Save email" busy={busy} onCancel={onCancel} />
		</form>
	);
}

function PasswordForm({ hasPassword, onDone, onCancel }) {
	const [form, setForm] = useState({ current: "", next: "", confirm: "" });
	const [show, setShow] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);
	const type = show ? "text" : "password";
	const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

	async function handleSubmit(e) {
		e.preventDefault();
		if (busy) return;
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
			await api.put(
				"/profile/credentials",
				hasPassword
					? { currentPassword: form.current, newPassword: form.next }
					: { newPassword: form.next },
			);
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
				{hasPassword && (
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
				)}
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
				submitLabel={hasPassword ? "Update password" : "Set password"}
				busy={busy}
				onCancel={onCancel}
			/>
		</form>
	);
}

function DeleteAccountForm({ hasPassword, onDeleted, onCancel }) {
	const [currentPassword, setCurrentPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);

	async function handleSubmit(e) {
		e.preventDefault();
		if (busy) return;
		setError(null);
		setBusy(true);
		try {
			if (hasPassword) {
				await api.post("/profile/delete-account", {
					password: currentPassword,
				});
			} else {
				// No password: confirm with Apple instead.
				const creds = await signInWithApple();
				if (!creds) {
					setBusy(false);
					return;
				}
				await api.post("/profile/delete-account", {
					appleIdentityToken: creds.identityToken,
				});
			}
			onDeleted();
		} catch (err) {
			setError(apiError(err, "Failed to delete account."));
			setBusy(false);
		}
	}

	return (
		<form className="settings-form" onSubmit={handleSubmit}>
			<p className="settings-row-hint">
				This permanently deletes your account and all your workouts, meals,
				weight and steps. It can't be undone.
			</p>
			{hasPassword ? (
				<div className="settings-fields">
					<CurrentPassword
						value={currentPassword}
						onChange={setCurrentPassword}
					/>
				</div>
			) : (
				<p className="settings-row-hint">
					You'll confirm with Apple before it's deleted.
				</p>
			)}
			{error && <p className="settings-error">{error}</p>}
			<div className="settings-actions">
				<button className="btn btn-danger" type="submit" disabled={busy}>
					{busy ? "Deleting..." : "Permanently delete"}
				</button>
				<button className="btn" type="button" onClick={onCancel}>
					Cancel
				</button>
			</div>
		</form>
	);
}

// ── Sign in with Apple (iOS app only) ───────────────────────────────────────

function AppleIdRow({ connected, onConnected }) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);

	if (!isAppleSignInAvailable()) return null;

	async function connect() {
		setError(null);
		let creds;
		try {
			creds = await signInWithApple();
		} catch {
			setError("Sign in with Apple didn't work. Try again.");
			return;
		}
		if (!creds) return;
		setBusy(true);
		try {
			const res = await api.post("/profile/apple", {
				identityToken: creds.identityToken,
				authorizationCode: creds.authorizationCode,
			});
			onConnected(res.data);
		} catch (err) {
			setError(apiError(err, "Couldn't connect your Apple ID."));
		} finally {
			setBusy(false);
		}
	}

	return (
		<>
			<Row
				label="Apple ID"
				icon={Apple}
				iconColor="#111318"
				hint={
					connected
						? "Sign in with Apple opens this account"
						: "Use Sign in with Apple for this account"
				}
			>
				{connected ? (
					<span className="settings-value">Connected</span>
				) : (
					<button
						type="button"
						className="btn btn-sm"
						aria-label="Connect Apple ID"
						disabled={busy}
						onClick={connect}
					>
						{busy ? "Connecting…" : "Connect"}
					</button>
				)}
			</Row>
			{error && <p className="settings-error settings-row-note">{error}</p>}
		</>
	);
}

// ── Face ID unlock (iOS app only) ───────────────────────────────────────────

function SecurityGroup() {
	const [type, setType] = useState("none");
	const [on, setOn] = useState(isLockOn);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		biometryType().then(setType);
	}, []);

	if (type === "none") return null;
	const name = type === "touchID" ? "Touch ID" : "Face ID";

	async function toggle() {
		if (on) {
			setLockOn(false);
			setOn(false);
			return;
		}
		// Check it works before turning it on, so nobody gets locked out.
		setBusy(true);
		const ok = await unlockWithBiometrics(`Turn on ${name} unlock`);
		setBusy(false);
		if (ok) {
			setLockOn(true);
			setOn(true);
		}
	}

	return (
		<Group title="Security">
			<Row
				label={`Unlock with ${name}`}
				icon={ScanFace}
				iconColor="#2f8f5b"
				hint={`Asks for ${name} when you open the app or come back after a minute.`}
			>
				<Switch
					ariaLabel={`Unlock with ${name}`}
					on={on}
					saving={busy}
					onToggle={toggle}
				/>
			</Row>
		</Group>
	);
}

// ── Apple Health (iOS app only) ─────────────────────────────────────────────

const MANUAL_SYNC_DAYS = 30;

function plural(n, one, many) {
	return `${n} ${n === 1 ? one : many}`;
}

function AppleHealthRow() {
	const [connected, setConnected] = useState(isHealthConnected);
	const [autoSteps, setAutoStepsState] = useState(isAutoStepsOn);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState(null);
	const [error, setError] = useState(null);

	if (!isHealthSupported()) return null;

	async function run(action) {
		setBusy(true);
		setMessage(null);
		setError(null);
		try {
			const r = await action();
			setConnected(isHealthConnected());
			setMessage(
				`Imported ${plural(r.steps, "day", "days")} of steps and ${plural(r.weights, "weigh-in", "weigh-ins")}.`,
			);
		} catch (err) {
			setError(err.message ?? "Couldn't import from Apple Health.");
		} finally {
			setBusy(false);
		}
	}

	function toggleAutoSteps() {
		const next = !autoSteps;
		setAutoSteps(next);
		setAutoStepsState(next);
	}

	const synced = lastHealthSync();
	const hint = connected
		? synced
			? `Last synced ${formatDate(localDateStr(new Date(synced)))}`
			: "Connected"
		: "Import steps and body weight";

	return (
		<>
			<Row label="Apple Health" hint={hint} icon={Heart} iconColor="#e0457b">
				<button
					type="button"
					className="btn btn-sm"
					disabled={busy}
					onClick={() =>
						run(connected ? () => syncHealth(MANUAL_SYNC_DAYS) : connectHealth)
					}
				>
					{busy ? "Importing…" : connected ? "Sync now" : "Connect"}
				</button>
			</Row>
			{connected && (
				<Row
					label="Update steps automatically"
					hint="From Apple Health, each time you open the app"
				>
					<Switch
						ariaLabel="Update steps automatically"
						on={autoSteps}
						onToggle={toggleAutoSteps}
					/>
				</Row>
			)}
			{message && <p className="settings-row-note">{message}</p>}
			{error && <p className="settings-error settings-row-note">{error}</p>}
		</>
	);
}

// ── Privacy group ───────────────────────────────────────────────────────────

function PrivacyGroup() {
	const { unit, toDisplay } = useWeightUnit();
	const username = useAuthStore((s) => s.username);
	const { data: prs } = usePRs();
	const [privacy, setPrivacy] = useState({
		shareData: false,
		shareCalendar: false,
	});
	const [privacyLoading, setPrivacyLoading] = useState(true);
	const [privacySaving, setPrivacySaving] = useState(null);
	const [privacyError, setPrivacyError] = useState(null);
	// When the current setting couldn't be read, the switches would show a
	// guessed "Off", so they stay hidden until a retry succeeds.
	const [privacyLoadFailed, setPrivacyLoadFailed] = useState(false);

	function loadPrivacy() {
		setPrivacyLoading(true);
		setPrivacyError(null);
		setPrivacyLoadFailed(false);
		api
			.get("/profile/privacy")
			.then((res) =>
				setPrivacy({
					shareData: Boolean(res.data.shareData),
					shareCalendar: Boolean(res.data.shareCalendar),
				}),
			)
			.catch(() => {
				setPrivacyError("Could not load privacy setting.");
				setPrivacyLoadFailed(true);
			})
			.finally(() => setPrivacyLoading(false));
	}

	useEffect(loadPrivacy, []);

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
		<Group title="Privacy">
			{privacyLoading ? (
				<Row label="Loading…" />
			) : privacyLoadFailed ? (
				<Row label="Sharing settings">
					<button type="button" className="btn btn-sm" onClick={loadPrivacy}>
						Retry
					</button>
				</Row>
			) : (
				<>
					<Row
						label="Share data on leaderboard"
						hint={leaderboardHint}
						icon={Trophy}
						iconColor="#4f46e5"
					>
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
						icon={CalendarDays}
						iconColor="#4f46e5"
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
			<Link to="/privacy" className="settings-row settings-row-button">
				<span className="settings-row-label">Privacy policy</span>
				<span className="settings-chevron" aria-hidden="true">
					›
				</span>
			</Link>
		</Group>
	);
}

// ── Data group (export / import) ────────────────────────────────────────────

function ImportResult({ result }) {
	if (!result.ok) {
		return (
			<p className="settings-error settings-row-note">
				Import failed — check file format
			</p>
		);
	}
	return (
		<div className="settings-row-note">
			<p className="settings-import-ok">
				✓ Import complete · {result.fileName}
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
								<td key={t.key}>{result.counts[`${t.key}${kind}`] ?? 0}</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function DataGroup() {
	const { data: weightData, refetch: refetchWeight } = useWeightLog();
	const { data: nutritionData, refetch: refetchNutrition } = useNutrition();
	const { data: workoutData, refetch: refetchWorkouts } = useWorkouts();
	const { data: stepData, refetch: refetchSteps } = useSteps();
	const exportData = { weightData, nutritionData, workoutData, stepData };
	const hasData =
		weightData.length > 0 ||
		nutritionData.length > 0 ||
		workoutData.length > 0 ||
		stepData.length > 0;

	const [importResult, setImportResult] = useState(null);
	const [importing, setImporting] = useState(false);
	const fileInputRef = useRef(null);

	async function handleImportJson(e) {
		const file = e.target.files?.[0];
		if (!fileInputRef.current) return;
		fileInputRef.current.value = "";
		if (!file || importing) return;

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

	return (
		<Group title="Data">
			<Row
				label="Export a backup"
				icon={Download}
				iconColor="#7b7f8c"
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
				icon={Upload}
				iconColor="#7b7f8c"
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
			{importResult && <ImportResult result={importResult} />}
		</Group>
	);
}

// ── Page ────────────────────────────────────────────────────────────────────

// Assume a password unless the server says otherwise, so the forms never
// drop "Current password" for an account that has one.
function signInMethods(data) {
	return {
		appleConnected: data?.appleConnected === true,
		passwordSet: data?.passwordSet !== false,
	};
}

export default function Settings() {
	const navigate = useNavigate();
	const { goals, loading, saving, error, saveGoals } = useUserProfile();
	const { unit, toggleUnit } = useWeightUnit();
	const [, , themeMode, setThemeMode] = useTheme();
	const username = useAuthStore((s) => s.username);
	const clearAuth = useAuthStore((s) => s.logout);

	// One editable row open at a time; "Saved!" shows on the row just saved.
	const [openRow, setOpenRow] = useState(null);
	const [savedRow, setSavedRow] = useState(null);
	const [currentEmail, setCurrentEmail] = useState("");
	const [signIn, setSignIn] = useState({
		appleConnected: false,
		passwordSet: true,
	});

	useEffect(() => {
		api
			.get("/profile/email")
			.then((res) => setCurrentEmail(res.data.email ?? ""))
			.catch(() => {});
		api
			.get("/profile/sign-in")
			.then((res) => setSignIn(signInMethods(res.data)))
			.catch(() => {});
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

	function logout() {
		api.post("/auth/logout").catch(() => {});
		clearAuth();
	}

	const goalsSummary = loading
		? "Loading…"
		: `${goals.calorieTargetTraining.toLocaleString()} / ${goals.calorieTargetRest.toLocaleString()} kcal · ${goals.proteinTarget} g`;

	return (
		<div className="settings-page">
			<PageHeader title="Settings" />

			<Group title="Goals">
				<EditRow
					label="Calorie & protein goals"
					icon={Flame}
					iconColor="#d9622b"
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
				<EditRow
					label="Daily steps goal"
					icon={Footprints}
					iconColor="#2f7ad6"
					value={
						loading
							? "Loading…"
							: `${(goals.stepsTarget ?? DEFAULT_STEPS_GOAL).toLocaleString()} steps`
					}
					saved={savedRow === "steps"}
					open={openRow === "steps"}
					disabled={loading}
					onToggle={() => toggleRow("steps")}
				>
					<StepsGoalForm
						goals={goals}
						saving={saving}
						error={error}
						saveGoals={saveGoals}
						onSaved={() => finishRow("steps")}
						onCancel={() => toggleRow("steps")}
					/>
				</EditRow>
			</Group>

			<Group title="Preferences">
				<Row label="Weight unit" icon={Ruler} iconColor="#5c5f6b">
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
				<Row label="Theme" icon={Moon} iconColor="#3a3d46">
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

			<PrivacyGroup />

			<Group title="Integrations">
				<button
					type="button"
					className="settings-row settings-row-button"
					onClick={() => navigate("/claude-setup")}
				>
					<RowIcon icon={Sparkles} color="#c06a3f" />
					<span className="settings-row-label">Claude integration</span>
					<span className="settings-value">Set up</span>
					<span className="settings-chevron" aria-hidden="true">
						›
					</span>
				</button>
				<AppleHealthRow />
			</Group>

			<DataGroup />

			<Group title="Account">
				<EditRow
					label="Username"
					icon={User}
					iconColor="#7b7f8c"
					value={username ?? "—"}
					saved={savedRow === "username"}
					open={openRow === "username"}
					onToggle={() => toggleRow("username")}
				>
					<UsernameForm
						hasPassword={signIn.passwordSet}
						onDone={() => finishRow("username")}
						onCancel={() => toggleRow("username")}
					/>
				</EditRow>
				<EditRow
					label="Email"
					icon={Mail}
					iconColor="#2f7ad6"
					value={currentEmail || "—"}
					saved={savedRow === "email"}
					open={openRow === "email"}
					onToggle={() => toggleRow("email")}
				>
					<EmailForm
						currentEmail={currentEmail}
						hasPassword={signIn.passwordSet}
						onDone={(newEmail) => {
							setCurrentEmail(newEmail);
							finishRow("email");
						}}
						onCancel={() => toggleRow("email")}
					/>
				</EditRow>
				<AppleIdRow
					connected={signIn.appleConnected}
					onConnected={(data) => setSignIn(signInMethods(data))}
				/>
				<EditRow
					label="Password"
					icon={KeyRound}
					iconColor="#7b7f8c"
					value={signIn.passwordSet ? "••••••••" : "Not set"}
					saved={savedRow === "password"}
					open={openRow === "password"}
					onToggle={() => toggleRow("password")}
				>
					<PasswordForm
						hasPassword={signIn.passwordSet}
						onDone={() => {
							setSignIn((current) => ({ ...current, passwordSet: true }));
							finishRow("password");
						}}
						onCancel={() => toggleRow("password")}
					/>
				</EditRow>
				<EditRow
					label="Delete account"
					icon={Trash2}
					iconColor="#c4361c"
					open={openRow === "delete"}
					onToggle={() => toggleRow("delete")}
				>
					<DeleteAccountForm
						hasPassword={signIn.passwordSet}
						onDeleted={clearAuth}
						onCancel={() => toggleRow("delete")}
					/>
				</EditRow>
			</Group>

			<SecurityGroup />

			<section className="settings-group" aria-label="Log out">
				<div className="settings-list">
					<button
						type="button"
						className="settings-row settings-row-button settings-logout"
						onClick={logout}
					>
						<span className="settings-row-label">Log out</span>
					</button>
				</div>
			</section>
		</div>
	);
}
