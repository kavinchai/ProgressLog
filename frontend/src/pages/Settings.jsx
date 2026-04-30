import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import useUserProfile from "../hooks/useUserProfile";
import useAuthStore from "../store/authStore";
import useWeightUnit from "../hooks/useWeightUnit";
import useWeightLog from "../hooks/useWeightLog";
import useNutrition from "../hooks/useNutrition";
import useWorkouts from "../hooks/useWorkouts";
import useSteps from "../hooks/useSteps";
import { buildDayRows } from "../utils/stats";
import { groupByExercise } from "../utils/workout";
import { formatDateShort as formatDate } from "../utils/date";
import api from "../api";
import "./Settings.css";

export default function Settings() {
	const navigate = useNavigate();
	const { goals, loading, saving, error, saveGoals } = useUserProfile();
	const { unit, toggleUnit } = useWeightUnit();

	const { data: weightData, refetch: refetchWeight } = useWeightLog();
	const { data: nutritionData, refetch: refetchNutrition } = useNutrition();
	const { data: workoutData, refetch: refetchWorkouts } = useWorkouts();
	const { data: stepData } = useSteps();

	const [importStatus, setImportStatus] = useState(null);
	const [importing, setImporting] = useState(false);
	const fileInputRef = useRef(null);

	const hasData =
		weightData.length > 0 ||
		nutritionData.length > 0 ||
		workoutData.length > 0 ||
		stepData.length > 0;

	const [form, setForm] = useState({
		calorieTargetTraining: "",
		calorieTargetRest: "",
		proteinTarget: "",
	});
	const [saved, setSaved] = useState(false);

	const login = useAuthStore((s) => s.login);
	const [currentPassword, setCurrentPassword] = useState("");
	const [passwordVerified, setPasswordVerified] = useState(false);
	const [verifying, setVerifying] = useState(false);
	const [verifyError, setVerifyError] = useState(null);
	const [credForm, setCredForm] = useState({
		newUsername: "",
		newPassword: "",
		email: "",
	});
	const [credSaving, setCredSaving] = useState(false);
	const [credSaved, setCredSaved] = useState(false);
	const [credError, setCredError] = useState(null);

	useEffect(() => {
		api
			.get("/profile/email")
			.then((res) => setCredForm((f) => ({ ...f, email: res.data.email })))
			.catch(() => {});
	}, []);

	useEffect(() => {
		if (!loading) {
			setForm({
				calorieTargetTraining: goals.calorieTargetTraining,
				calorieTargetRest: goals.calorieTargetRest,
				proteinTarget: goals.proteinTarget,
			});
		}
	}, [loading, goals]);

	async function handleSubmit(e) {
		e.preventDefault();
		setSaved(false);
		try {
			await saveGoals({
				calorieTargetTraining: parseInt(form.calorieTargetTraining, 10),
				calorieTargetRest: parseInt(form.calorieTargetRest, 10),
				proteinTarget: parseInt(form.proteinTarget, 10),
			});
			setSaved(true);
			setTimeout(() => setSaved(false), 3000);
		} catch {
			/* error shown via hook */
		}
	}

	function handleChange(e) {
		const { name, value } = e.target;
		setSaved(false);
		setForm((f) => ({ ...f, [name]: value }));
	}

	function handleCredChange(e) {
		const { name, value } = e.target;
		setCredSaved(false);
		setCredError(null);
		setCredForm((f) => ({ ...f, [name]: value }));
	}

	async function handleVerify(e) {
		e.preventDefault();
		setVerifyError(null);
		setVerifying(true);
		try {
			await api.post("/profile/verify-password", { password: currentPassword });
			setPasswordVerified(true);
		} catch (err) {
			setVerifyError(err.response?.data?.message ?? "Incorrect password.");
		} finally {
			setVerifying(false);
		}
	}

	// ── Export / Import helpers ───────────────────────────────────────────────

	function buildExportData() {
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
		const setHeaders = Array.from(
			{ length: maxSets },
			(_, i) => `Set ${i + 1}`,
		);
		const normalizedWorkoutRows = workoutRows.map((row) => {
			const normalized = {
				Date: row.Date,
				Exercise: row.Exercise,
				Weight: row.Weight,
			};
			for (const h of setHeaders) normalized[h] = row[h] ?? "";
			return normalized;
		});

		return { statsData, normalizedWorkoutRows };
	}

	function handleExportXlsx() {
		const { statsData, normalizedWorkoutRows } = buildExportData();
		const ws1 = XLSX.utils.json_to_sheet(statsData);
		const ws2 = XLSX.utils.json_to_sheet(
			normalizedWorkoutRows.length
				? normalizedWorkoutRows
				: [{ Date: "", Exercise: "", Weight: "" }],
		);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws1, "Total Stats");
		XLSX.utils.book_append_sheet(wb, ws2, "Workouts");
		XLSX.writeFile(wb, "total-stats.xlsx");
	}

	function handleExportJson() {
		const { statsData, normalizedWorkoutRows } = buildExportData();
		const json = JSON.stringify(
			{ totalStats: statsData, workouts: normalizedWorkoutRows },
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

	async function handleImportJson(e) {
		const file = e.target.files?.[0];
		if (!fileInputRef.current) return;
		fileInputRef.current.value = "";
		if (!file) return;

		setImporting(true);
		setImportStatus(null);
		try {
			const text = await file.text();
			const payload = JSON.parse(text);
			const res = await api.post("/import", payload);
			const {
				weightImported,
				weightSkipped,
				nutritionImported,
				nutritionSkipped,
				workoutsImported,
				workoutsSkipped,
			} = res.data;
			setImportStatus({
				ok: true,
				message: `imported: ${weightImported} weight, ${nutritionImported} nutrition, ${workoutsImported} workouts  |  skipped: ${weightSkipped} weight, ${nutritionSkipped} nutrition, ${workoutsSkipped} workouts`,
			});
			refetchWeight();
			refetchNutrition();
			refetchWorkouts();
		} catch {
			setImportStatus({
				ok: false,
				message: "Import failed — check file format",
			});
		} finally {
			setImporting(false);
		}
	}

	async function handleCredSubmit(e) {
		e.preventDefault();
		setCredSaved(false);
		setCredError(null);
		if (
			!credForm.newUsername.trim() &&
			!credForm.newPassword &&
			!credForm.email.trim()
		) {
			setCredError("Enter a new username, password, or email.");
			return;
		}
		setCredSaving(true);
		try {
			const promises = [];

			if (credForm.newUsername.trim() || credForm.newPassword) {
				promises.push(
					api
						.put("/profile/credentials", {
							currentPassword,
							newUsername: credForm.newUsername.trim() || undefined,
							newPassword: credForm.newPassword || undefined,
						})
						.then((res) => login(res.data.username)),
				);
			}

			if (credForm.email.trim()) {
				promises.push(
					api.put("/profile/email", { email: credForm.email.trim() }),
				);
			}

			await Promise.all(promises);
			setCurrentPassword("");
			setPasswordVerified(false);
			setCredForm((f) => ({
				newUsername: "",
				newPassword: "",
				email: f.email,
			}));
			setCredSaved(true);
			setTimeout(() => setCredSaved(false), 3000);
		} catch (err) {
			const msg = err.response?.data?.message ?? "Failed to update account.";
			setCredError(msg);
		} finally {
			setCredSaving(false);
		}
	}

	return (
		<div className="settings-page">
			<div className="settings-header">
				<h1 className="settings-title">Settings</h1>
				<p className="settings-sub">
					Nutrition goals used across all stats pages
				</p>
			</div>

			{loading ? (
				<p className="settings-loading">Loading…</p>
			) : (
				<form className="settings-form" onSubmit={handleSubmit}>
					<div className="settings-section-label">Calorie Targets</div>

					<div className="settings-field">
						<label htmlFor="calorieTargetTraining">Training Day</label>
						<div className="settings-input-row">
							<input
								id="calorieTargetTraining"
								name="calorieTargetTraining"
								type="number"
								min="1"
								value={form.calorieTargetTraining}
								onChange={handleChange}
								required
							/>
							<span className="settings-unit">kcal</span>
						</div>
					</div>

					<div className="settings-field">
						<label htmlFor="calorieTargetRest">Rest Day</label>
						<div className="settings-input-row">
							<input
								id="calorieTargetRest"
								name="calorieTargetRest"
								type="number"
								min="1"
								value={form.calorieTargetRest}
								onChange={handleChange}
								required
							/>
							<span className="settings-unit">kcal</span>
						</div>
					</div>

					<div className="settings-section-label" style={{ marginTop: 24 }}>
						Protein Target
					</div>

					<div className="settings-field">
						<label htmlFor="proteinTarget">Daily Goal</label>
						<div className="settings-input-row">
							<input
								id="proteinTarget"
								name="proteinTarget"
								type="number"
								min="1"
								value={form.proteinTarget}
								onChange={handleChange}
								required
							/>
							<span className="settings-unit">g</span>
						</div>
					</div>

					{error && <p className="settings-error">{error}</p>}

					<div className="settings-actions">
						<button className="btn btn-primary" type="submit" disabled={saving}>
							{saving ? "Saving..." : "Save Goals"}
						</button>
						{saved && <span className="settings-saved">Saved!</span>}
					</div>
				</form>
			)}

			<div className="settings-form">
				<div className="settings-section-label" style={{ marginTop: 32 }}>
					Units
				</div>
				<div className="settings-field">
					<label>Weight Unit</label>
					<div className="settings-input-row">
						<div
							className="unit-toggle"
							onClick={toggleUnit}
							role="button"
							aria-label="Toggle weight unit"
						>
							<span
								className={`unit-toggle-label${unit === "lbs" ? " active" : ""}`}
							>
								lbs
							</span>
							<div className={`toggle-track${unit === "kg" ? " on" : ""}`}>
								<div className="toggle-thumb" />
							</div>
							<span
								className={`unit-toggle-label${unit === "kg" ? " active" : ""}`}
							>
								kg
							</span>
						</div>
					</div>
				</div>
			</div>

			<div className="settings-form">
				<div className="settings-section-label" style={{ marginTop: 32 }}>
					Claude Integration
				</div>
				<p
					style={{
						fontSize: "var(--fs-sm)",
						color: "var(--muted)",
						margin: "0 0 12px",
					}}
				>
					Log workouts, meals, steps and more by chatting with Claude.
				</p>
				<div className="settings-actions" style={{ marginTop: 0 }}>
					<button
						className="btn btn-sm btn-primary"
						onClick={() => navigate("/claude-setup")}
					>
						Set up Claude integration →
					</button>
				</div>
			</div>

			<div className="settings-form">
				<div className="settings-section-label" style={{ marginTop: 16 }}>
					Data
				</div>
				<p className="settings-help">
					Back up your stats, move them to another device, or restore from a
					previous export.
				</p>

				<div className="data-grid">
					<div className="data-card">
						<div className="data-card-header">
							<span className="data-card-title">Export</span>
							<span className="data-card-sub">
								Download a copy of all your logged data.
							</span>
						</div>
						<div className="data-card-body">
							<button
								className="btn btn-primary data-btn"
								onClick={handleExportXlsx}
								disabled={!hasData}
							>
								<span className="data-btn-label">Export as XLSX</span>
							</button>
							<button
								className="btn data-btn"
								onClick={handleExportJson}
								disabled={!hasData}
							>
								<span className="data-btn-label">Export as JSON</span>
							</button>
						</div>
						{!hasData && (
							<p className="settings-help" style={{ margin: 0 }}>
								Log some data to enable export.
							</p>
						)}
					</div>

					<div className="data-card">
						<div className="data-card-header">
							<span className="data-card-title">Import</span>
							<span className="data-card-sub">
								Restore a JSON export. Existing entries are kept; duplicates are
								skipped.
							</span>
						</div>
						<div className="data-card-body">
							<button
								className="btn data-btn"
								disabled={importing}
								onClick={() => fileInputRef.current?.click()}
							>
								<span className="data-btn-label">
									{importing ? "Importing..." : "Choose JSON file"}
								</span>
							</button>
							<input
								ref={fileInputRef}
								type="file"
								accept=".json"
								style={{ display: "none" }}
								onChange={handleImportJson}
							/>
						</div>
						{importStatus && (
							<p
								className={
									"data-status" +
									(importStatus.ok ? " data-status-ok" : " data-status-err")
								}
							>
								{importStatus.message}
							</p>
						)}
					</div>
				</div>
			</div>

			<div className="settings-form settings-credentials">
				<div className="settings-section-label" style={{ marginTop: 32 }}>
					Account
				</div>

				{!passwordVerified ? (
					<form onSubmit={handleVerify} style={{ display: "contents" }}>
						<div className="settings-field">
							<label htmlFor="currentPassword">Current Password</label>
							<div className="settings-input-row">
								<input
									id="currentPassword"
									name="currentPassword"
									type="password"
									autoComplete="current-password"
									value={currentPassword}
									onChange={(e) => {
										setCurrentPassword(e.target.value);
										setVerifyError(null);
									}}
									required
								/>
							</div>
						</div>

						{verifyError && <p className="settings-error">{verifyError}</p>}

						<div className="settings-actions">
							<button
								className="btn btn-primary"
								type="submit"
								disabled={verifying}
							>
								{verifying ? "Verifying..." : "Verify"}
							</button>
						</div>
					</form>
				) : (
					<form onSubmit={handleCredSubmit} style={{ display: "contents" }}>
						<div className="settings-field">
							<label htmlFor="email">New Email</label>
							<div className="settings-input-row">
								<input
									id="email"
									name="email"
									type="email"
									autoComplete="email"
									value={credForm.email}
									onChange={handleCredChange}
								/>
							</div>
						</div>

						<div className="settings-field">
							<label htmlFor="newUsername">New Username</label>
							<div className="settings-input-row">
								<input
									id="newUsername"
									name="newUsername"
									type="text"
									autoComplete="username"
									value={credForm.newUsername}
									onChange={handleCredChange}
								/>
							</div>
						</div>

						<div className="settings-field">
							<label htmlFor="newPassword">New Password</label>
							<div className="settings-input-row">
								<input
									id="newPassword"
									name="newPassword"
									type="password"
									autoComplete="new-password"
									value={credForm.newPassword}
									onChange={handleCredChange}
								/>
							</div>
						</div>

						{credError && <p className="settings-error">{credError}</p>}

						<div className="settings-actions">
							<button
								className="btn btn-primary"
								type="submit"
								disabled={credSaving}
							>
								{credSaving ? "Saving..." : "Save Account"}
							</button>
							{credSaved && <span className="settings-saved">Saved!</span>}
						</div>
					</form>
				)}
			</div>
		</div>
	);
}
