import { useState, useEffect } from "react";
import useUserProfile from "../hooks/useUserProfile";
import useAuthStore from "../store/authStore";
import useWeightUnit from "../hooks/useWeightUnit";
import api from "../api";
import "./Settings.css";

export default function Settings() {
	const { goals, loading, saving, error, saveGoals } = useUserProfile();
	const { unit, toggleUnit } = useWeightUnit();
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
						.then((res) => login(res.data.token, res.data.username)),
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
						<div className="unit-toggle" onClick={toggleUnit} role="button" aria-label="Toggle weight unit">
							<span className={`unit-toggle-label${unit === "lbs" ? " active" : ""}`}>lbs</span>
							<div className={`toggle-track${unit === "kg" ? " on" : ""}`}>
								<div className="toggle-thumb" />
							</div>
							<span className={`unit-toggle-label${unit === "kg" ? " active" : ""}`}>kg</span>
						</div>
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
