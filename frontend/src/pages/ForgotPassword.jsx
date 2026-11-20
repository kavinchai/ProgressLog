import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { errorMessage } from "../utils/errors";
import "./Login.css";

const OFFLINE = "You're offline. Connect and try again.";

/** Forgot password: email a 6-digit code, then type it in with a new password. */
export default function ForgotPassword() {
	const navigate = useNavigate();
	const [step, setStep] = useState("ask"); // "ask" | "code"
	const [identifier, setIdentifier] = useState("");
	const [code, setCode] = useState("");
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	const [loading, setLoading] = useState(false);

	async function requestCode() {
		await api.post("/auth/forgot-password", { identifier: identifier.trim() });
	}

	async function handleAsk(e) {
		e.preventDefault();
		if (loading) return;
		setError("");
		setLoading(true);
		try {
			await requestCode();
			setStep("code");
		} catch (err) {
			setError(
				errorMessage(err, "Couldn't send the code. Try again.", OFFLINE),
			);
		} finally {
			setLoading(false);
		}
	}

	async function handleResend() {
		if (loading) return;
		setError("");
		setNotice("");
		setLoading(true);
		try {
			await requestCode();
			setNotice("We sent another code if an account matches.");
		} catch (err) {
			setError(
				errorMessage(err, "Couldn't send the code. Try again.", OFFLINE),
			);
		} finally {
			setLoading(false);
		}
	}

	async function handleReset(e) {
		e.preventDefault();
		if (loading) return;
		setNotice("");
		if (!/^\d{6}$/.test(code)) {
			setError("Enter the 6-digit code from the email.");
			return;
		}
		if (password.length < 6) {
			setError("Password must be at least 6 characters.");
			return;
		}
		if (password !== confirm) {
			setError("Passwords don't match.");
			return;
		}
		setError("");
		setLoading(true);
		try {
			const id = identifier.trim();
			await api.post("/auth/reset-password", {
				identifier: id,
				code,
				newPassword: password,
			});
			navigate("/login", {
				replace: true,
				state: {
					notice: "Password reset. Sign in with your new password.",
					username: id.includes("@") ? "" : id,
				},
			});
		} catch (err) {
			setError(
				errorMessage(err, "Couldn't reset the password. Try again.", OFFLINE),
			);
			setLoading(false);
		}
	}

	function backToAsk() {
		setStep("ask");
		setError("");
		setNotice("");
		setCode("");
		setPassword("");
		setConfirm("");
	}

	return (
		<div className="login-page">
			<div className="login-card">
				<div className="login-inner">
					{step === "ask" ? (
						<>
							<Link to="/login" className="login-back">
								‹ Sign in
							</Link>
							<h1 className="login-apple-title">Reset password</h1>
							<p className="login-apple-hint">
								Enter your username or email and we'll email you a 6-digit code.
							</p>
							<form className="login-form" onSubmit={handleAsk}>
								{error && <div className="login-error">{error}</div>}
								<div className="login-group login-group--wide">
									<div className="login-field">
										<label htmlFor="identifier">Username or email</label>
										<input
											id="identifier"
											type="text"
											className="login-input"
											placeholder="Required"
											value={identifier}
											onChange={(e) => setIdentifier(e.target.value)}
											required
											autoFocus
											autoComplete="username"
											autoCapitalize="none"
											autoCorrect="off"
											spellCheck={false}
										/>
									</div>
								</div>
								<button className="login-btn" type="submit" disabled={loading}>
									{loading ? "Sending..." : "Send code"}
								</button>
							</form>
						</>
					) : (
						<>
							<button type="button" className="login-back" onClick={backToAsk}>
								‹ Back
							</button>
							<h1 className="login-apple-title">Check your email</h1>
							<p className="login-apple-hint">
								If an account matches, we sent it a 6-digit code. It expires in
								15 minutes.
							</p>
							<form className="login-form" onSubmit={handleReset} noValidate>
								{error && <div className="login-error">{error}</div>}
								{notice && (
									<div className="login-notice" role="status">
										{notice}
									</div>
								)}
								<div className="login-group login-group--wide">
									<div className="login-field">
										<label htmlFor="reset-code">Code</label>
										<input
											id="reset-code"
											type="text"
											className="login-input login-code-input"
											placeholder="6 digits"
											value={code}
											onChange={(e) =>
												setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
											}
											inputMode="numeric"
											autoComplete="one-time-code"
											autoFocus
										/>
									</div>
									<div className="login-field">
										<label htmlFor="new-password">New password</label>
										<input
											id="new-password"
											type="password"
											className="login-input"
											placeholder="6+ characters"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											autoComplete="new-password"
										/>
									</div>
									<div className="login-field">
										<label htmlFor="confirm-password">Confirm password</label>
										<input
											id="confirm-password"
											type="password"
											className="login-input"
											placeholder="Required"
											value={confirm}
											onChange={(e) => setConfirm(e.target.value)}
											autoComplete="new-password"
										/>
									</div>
								</div>
								<button className="login-btn" type="submit" disabled={loading}>
									{loading ? "Resetting..." : "Reset password"}
								</button>
							</form>
							<button
								type="button"
								className="login-switch-btn"
								onClick={handleResend}
								disabled={loading}
							>
								Resend code
							</button>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
