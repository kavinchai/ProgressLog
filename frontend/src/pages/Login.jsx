import { useState } from "react";
import api from "../api";
import useAuthStore from "../store/authStore";
import "./Login.css";

export default function Login() {
	const login = useAuthStore((state) => state.login);
	const [mode, setMode] = useState("login");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [email, setEmail] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const isSignup = mode === "signup";

	async function handleSubmit(e) {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			const endpoint = isSignup ? "/auth/register" : "/auth/login";
			const body = isSignup ? { username, password, email } : { username, password };
			const res = await api.post(endpoint, body);
			login(res.data.token, res.data.username);
		} catch (err) {
			const status = err.response?.status;
			const msg = err.response?.data?.message;
			setError(
				msg ??
					(status
						? `${isSignup ? "Registration" : "Login"} failed (HTTP ${status}).`
						: isSignup
							? "Registration failed."
							: "Invalid username or password."),
			);
		} finally {
			setLoading(false);
		}
	}

	function switchMode() {
		setMode(isSignup ? "login" : "signup");
		setError("");
		setUsername("");
		setPassword("");
		setEmail("");
	}

	return (
		<div className="login-page">
			<div className="login-card">
				<div className="login-inner">
					<div className="login-title">FitTrack</div>
					<div className="login-divider">
						{isSignup ? "Create your account" : "Welcome back"}
					</div>
					<form className="login-form" onSubmit={handleSubmit}>
						{error && <div className="login-error">{error}</div>}

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

						{isSignup && (
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

						<button className="login-btn" type="submit" disabled={loading}>
							{loading
								? isSignup
									? "Creating account..."
									: "Signing in..."
								: isSignup
									? "Create Account"
									: "Sign In"}
						</button>
					</form>

					<button className="login-switch-btn" onClick={switchMode}>
						{isSignup
							? "Already have an account? Sign in"
							: "Don't have an account? Sign up"}
					</button>
				</div>
			</div>
		</div>
	);
}
