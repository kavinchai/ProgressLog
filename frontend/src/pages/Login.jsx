import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api";
import useAuthStore from "../store/authStore";
import "./Login.css";

export default function Login() {
	const login = useAuthStore((state) => state.login);
	const [searchParams] = useSearchParams();
	const [mode, setMode] = useState(searchParams.get("mode") === "signup" ? "signup" : "login");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [email, setEmail] = useState("");
	const [error, setError] = useState("");
	const [info, setInfo] = useState("");
	const [loading, setLoading] = useState(false);

	const isSignup = mode === "signup";
	const isForgot = mode === "forgot";

	async function handleSubmit(e) {
		e.preventDefault();
		setError("");
		setInfo("");
		setLoading(true);
		try {
			if (isForgot) {
				await api.post("/auth/forgot-password", { username, email });
				setInfo("If an account matches, check your email for a reset link. The link expires in 5 minutes.");
			} else {
				const endpoint = isSignup ? "/auth/register" : "/auth/login";
				const body = isSignup ? { username, password, email } : { username, password };
				const res = await api.post(endpoint, body);
				login(res.data.username);
			}
		} catch (err) {
			const status = err.response?.status;
			const msg = err.response?.data?.message;
			if (isForgot) {
				setError(msg ?? (status ? `Request failed (HTTP ${status}).` : "Request failed."));
			} else {
				setError(
					msg ??
						(status
							? `${isSignup ? "Registration" : "Login"} failed (HTTP ${status}).`
							: isSignup
								? "Registration failed."
								: "Invalid username or password."),
				);
			}
		} finally {
			setLoading(false);
		}
	}

	function switchTo(next) {
		setMode(next);
		setError("");
		setInfo("");
		setUsername("");
		setPassword("");
		setEmail("");
	}

	function switchMode() {
		switchTo(isSignup ? "login" : "signup");
	}

	const subtitle = isForgot
		? "Reset your password"
		: isSignup
			? "Create your account"
			: "Welcome back";

	const submitLabel = isForgot
		? loading
			? "Sending..."
			: "Send reset link"
		: isSignup
			? loading
				? "Creating account..."
				: "Create Account"
			: loading
				? "Signing in..."
				: "Sign In";

	return (
		<div className="login-page">
			<div className="login-card">
				<div className="login-inner">
					<div className="login-title">ProgressLog</div>
					<div className="login-divider">{subtitle}</div>
					<form className="login-form" onSubmit={handleSubmit}>
						{error && <div className="login-error">{error}</div>}
						{info && <div className="login-info">{info}</div>}

						<div className="login-field">
							<label htmlFor="username">Username</label>
							<input
								id="username"
								type="text"
								className="login-input"
								placeholder="Enter your username"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								required
								autoComplete="username"
							/>
						</div>

						{(isSignup || isForgot) && (
							<div className="login-field">
								<label htmlFor="email">Email</label>
								<input
									id="email"
									type="email"
									className="login-input"
									placeholder="you@example.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									autoComplete="email"
								/>
							</div>
						)}

						{!isForgot && (
							<div className="login-field">
								<label htmlFor="password">Password</label>
								<input
									id="password"
									type="password"
									className="login-input"
									placeholder="Enter your password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									autoComplete={isSignup ? "new-password" : "current-password"}
								/>
							</div>
						)}

						<button className="login-btn" type="submit" disabled={loading}>
							{submitLabel}
						</button>
					</form>

					{isForgot ? (
						<button className="login-switch-btn" onClick={() => switchTo("login")}>
							Back to sign in
						</button>
					) : (
						<>
							<button className="login-switch-btn" onClick={switchMode}>
								{isSignup
									? "Already have an account? Sign in"
									: "Don't have an account? Sign up"}
							</button>
							{!isSignup && (
								<button
									className="login-switch-btn login-forgot-btn"
									onClick={() => switchTo("forgot")}
								>
									Forgot password?
								</button>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}
