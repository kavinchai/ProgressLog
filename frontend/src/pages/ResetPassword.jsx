import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api";
import "./Login.css";

export default function ResetPassword() {
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");

	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);
	const [loading, setLoading] = useState(false);

	if (!token) {
		return (
			<div className="login-page">
				<div className="login-card">
					<div className="login-inner">
						<div className="login-title">ProgressLog</div>
						<div className="login-divider">Reset your password</div>
						<div className="login-error">Invalid or missing reset link.</div>
						<Link className="login-switch-btn" to="/login">
							Back to sign in
						</Link>
					</div>
				</div>
			</div>
		);
	}

	async function handleSubmit(e) {
		e.preventDefault();
		setError("");
		if (newPassword !== confirmPassword) {
			setError("Passwords do not match.");
			return;
		}
		setLoading(true);
		try {
			await api.post("/auth/reset-password", { token, newPassword });
			setSuccess(true);
		} catch (err) {
			const msg = err.response?.data?.message;
			setError(msg ?? "Invalid or expired reset link.");
		} finally {
			setLoading(false);
		}
	}

	if (success) {
		return (
			<div className="login-page">
				<div className="login-card">
					<div className="login-inner">
						<div className="login-title">ProgressLog</div>
						<div className="login-divider">Password reset</div>
						<div className="login-info">
							Your password has been reset. You can now sign in with the new password.
						</div>
						<Link className="login-switch-btn" to="/login">
							Sign in
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="login-page">
			<div className="login-card">
				<div className="login-inner">
					<div className="login-title">ProgressLog</div>
					<div className="login-divider">Choose a new password</div>
					<form className="login-form" onSubmit={handleSubmit}>
						{error && <div className="login-error">{error}</div>}

						<div className="login-field">
							<label htmlFor="newPassword">New password</label>
							<input
								id="newPassword"
								type="password"
								className="login-input"
								placeholder="At least 6 characters"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								required
								minLength={6}
								autoComplete="new-password"
							/>
						</div>

						<div className="login-field">
							<label htmlFor="confirmPassword">Confirm password</label>
							<input
								id="confirmPassword"
								type="password"
								className="login-input"
								placeholder="Re-enter your new password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								required
								minLength={6}
								autoComplete="new-password"
							/>
						</div>

						<button className="login-btn" type="submit" disabled={loading}>
							{loading ? "Resetting..." : "Reset password"}
						</button>
					</form>

					<Link className="login-switch-btn" to="/login">
						Back to sign in
					</Link>
				</div>
			</div>
		</div>
	);
}
