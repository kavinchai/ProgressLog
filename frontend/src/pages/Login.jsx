import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api";
import useAuthStore from "../store/authStore";
import { isAppleSignInAvailable, signInWithApple } from "../native/appleSignIn";
import "./Login.css";

const APPLE_FAILED = "Sign in with Apple didn't work. Try again.";

// A starting username from the first name Apple shares, if it's usable.
function suggestUsername(givenName) {
	const name = (givenName ?? "").toLowerCase().replace(/[^a-z0-9_.]/g, "");
	return name.length >= 3 ? name.slice(0, 50) : "";
}

export default function Login() {
	const login = useAuthStore((state) => state.login);
	const [searchParams] = useSearchParams();
	const [mode, setMode] = useState(
		searchParams.get("mode") === "signup" ? "signup" : "login",
	);
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [email, setEmail] = useState("");
	const [rememberMe, setRememberMe] = useState(true);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	// Set while a new Apple ID picks its username.
	const [appleSignup, setAppleSignup] = useState(null);
	const [appleUsername, setAppleUsername] = useState("");

	const isSignup = mode === "signup";

	async function handleApple() {
		if (loading) return;
		setError("");
		let creds;
		try {
			creds = await signInWithApple();
		} catch {
			setError(APPLE_FAILED);
			return;
		}
		if (!creds) return;
		setLoading(true);
		try {
			const res = await api.post("/auth/apple", {
				identityToken: creds.identityToken,
				authorizationCode: creds.authorizationCode,
				rememberMe,
			});
			if (res.data.needsUsername) {
				setAppleSignup(creds);
				setAppleUsername(suggestUsername(creds.givenName));
			} else {
				login(res.data.username);
			}
		} catch (err) {
			setError(err.response?.data?.message ?? APPLE_FAILED);
		} finally {
			setLoading(false);
		}
	}

	async function handleAppleRegister(e) {
		e.preventDefault();
		if (loading) return;
		setError("");
		setLoading(true);
		try {
			const res = await api.post("/auth/apple/register", {
				identityToken: appleSignup.identityToken,
				authorizationCode: appleSignup.authorizationCode,
				username: appleUsername.trim(),
				rememberMe,
			});
			login(res.data.username);
		} catch (err) {
			setError(err.response?.data?.message ?? APPLE_FAILED);
			setLoading(false);
		}
	}

	function cancelAppleSignup() {
		setAppleSignup(null);
		setError("");
	}

	async function handleSubmit(e) {
		e.preventDefault();
		if (loading) return;
		setError("");
		setLoading(true);
		try {
			const endpoint = isSignup ? "/auth/register" : "/auth/login";
			const body = isSignup
				? { username, password, email, rememberMe }
				: { username, password, rememberMe };
			const res = await api.post(endpoint, body);
			login(res.data.username);
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

	if (appleSignup) {
		return (
			<div className="login-page">
				<div className="login-card">
					<div className="login-inner">
						<h1 className="login-apple-title">Pick a username</h1>
						<p className="login-apple-hint">
							It shows on the leaderboard if you share your lifts. You can
							change it later.
						</p>
						<form className="login-form" onSubmit={handleAppleRegister}>
							{error && <div className="login-error">{error}</div>}
							<div className="login-field">
								<label htmlFor="apple-username">Username</label>
								<input
									id="apple-username"
									type="text"
									className="login-input"
									value={appleUsername}
									onChange={(e) => setAppleUsername(e.target.value)}
									minLength={3}
									maxLength={50}
									required
									autoFocus
									autoComplete="username"
									autoCapitalize="none"
									autoCorrect="off"
									spellCheck={false}
								/>
							</div>
							<button className="login-btn" type="submit" disabled={loading}>
								{loading ? "Creating account..." : "Continue"}
							</button>
						</form>
						<button className="login-switch-btn" onClick={cancelAppleSignup}>
							Cancel
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="login-page">
			<div className="login-card">
				<div className="login-inner">
					<img className="login-icon" src="/favicon.svg" alt="" />
					<div className="login-title">Progress Logger</div>
					<div className="login-divider">
						{isSignup ? "Create your account" : "Welcome back"}
					</div>
					{isAppleSignInAvailable() && (
						<>
							<button
								type="button"
								className="login-apple-btn"
								onClick={handleApple}
								disabled={loading}
							>
								{/* Apple's logo glyph; only shown on Apple devices. */}
								<span aria-hidden="true">{"\uF8FF"}</span>
								{isSignup ? "Sign up with Apple" : "Sign in with Apple"}
							</button>
							<div className="login-or">or</div>
						</>
					)}
					<form className="login-form" onSubmit={handleSubmit}>
						{error && <div className="login-error">{error}</div>}

						<div className="login-group">
							<div className="login-field">
								<label htmlFor="username">Username</label>
								<input
									id="username"
									type="text"
									className="login-input"
									placeholder="Required"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									required
									autoComplete="username"
									autoCapitalize="none"
									autoCorrect="off"
									spellCheck={false}
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
									placeholder="Required"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									autoComplete={isSignup ? "new-password" : "current-password"}
								/>
							</div>
						</div>

						<label className="login-remember login-group" htmlFor="remember-me">
							Keep me signed in
							<input
								id="remember-me"
								type="checkbox"
								checked={rememberMe}
								onChange={(e) => setRememberMe(e.target.checked)}
							/>
						</label>

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

					<Link to="/privacy" className="login-privacy-link">
						Privacy policy
					</Link>
				</div>
			</div>
		</div>
	);
}
