import { useState } from "react";
import api from "../api";
import useAuthStore from "../store/authStore";
import "./Login.css";

export default function Login() {
	const login = useAuthStore((state) => state.login);
	const [mode, setMode] = useState("login"); // 'login' | 'signup'
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const isSignup = mode === "signup";

	async function handleSubmit(e) {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			const endpoint = isSignup ? "/auth/register" : "/auth/login";
			const res = await api.post(endpoint, { username, password });
			login(res.data.token, res.data.username);
		} catch (err) {
			setError(
				err.response?.data?.message ??
					(isSignup ? "Registration failed." : "Invalid username or password."),
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
	}

	return (
		<div className="login-page">
			<div className="login-card">
				<div className="login-top-border">{"_".repeat(28)}</div>

				<div className="login-inner">
					<div className="login-title">| fit track |</div>
					<div className="login-divider">{"|" + "-".repeat(25) + "|"}</div>

					<form className="login-form" onSubmit={handleSubmit}>
						{error && <div className="login-error">! {error}</div>}

						<div className="login-field">
							<label htmlFor="username">username:</label>
							<input
								id="username"
								type="text"
								className="login-input"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								required
								autoComplete="username"
							/>
						</div>

						<div className="login-field">
							<label htmlFor="password">password:</label>
							<input
								id="password"
								type="password"
								className="login-input"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								autoComplete={isSignup ? "new-password" : "current-password"}
							/>
						</div>

						<button className="login-btn" type="submit" disabled={loading}>
							{loading
								? isSignup
									? "| signing up... |"
									: "| logging in... |"
								: isSignup
									? "|   sign Up   |"
									: "|   log In   |"}
						</button>
					</form>

					<button className="login-switch-btn" onClick={switchMode}>
						{isSignup
							? "already have an account? log in"
							: "don't have an account? sign up"}
					</button>
				</div>

				<div className="login-bottom-border">{"_".repeat(28)}</div>
			</div>
		</div>
	);
}
