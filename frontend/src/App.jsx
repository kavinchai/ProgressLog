import {
	BrowserRouter,
	Routes,
	Route,
	Navigate,
	useLocation,
} from "react-router-dom";
import { useEffect } from "react";
import useAuthStore from "./store/authStore";
import useTheme from "./hooks/useTheme";
import useWidgetSync from "./hooks/useWidgetSync";
import { refreshAll } from "./hooks/useFetch";
import {
	isAutoStepsOn,
	isHealthConnected,
	isHealthSupported,
	syncHealth,
} from "./native/health";
import Sidebar from "./components/layout/Sidebar";
import BottomTabBar from "./components/layout/BottomTabBar";
import PullToRefresh from "./components/PullToRefresh";
import AppLock from "./components/AppLock";
import SplashPage from "./pages/SplashPage";
import Community from "./pages/Community";
import Login from "./pages/Login";
import Today from "./pages/Today";
import History from "./pages/History";
import Progress from "./pages/Progress";
import Settings from "./pages/Settings";
import ClaudeSetup from "./pages/ClaudeSetup";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import OfflineBanner from "./components/OfflineBanner";

function ScrollToTop() {
	const { pathname } = useLocation();
	useEffect(() => {
		document.documentElement.scrollTop = 0;
		document.body.scrollTop = 0;
	}, [pathname]);
	return null;
}

const AUTO_SYNC_DAYS = 7;

// iOS app: if the user turned on automatic step updates, pull the last week
// of steps from Apple Health.
function syncSteps() {
	if (!(isHealthSupported() && isHealthConnected() && isAutoStepsOn())) {
		return Promise.resolve();
	}
	return syncHealth(AUTO_SYNC_DAYS, { weights: false }).catch(() => {});
}

// Pull to refresh: reload what's on screen and pick up new steps.
function refreshScreen() {
	return Promise.all([refreshAll(), syncSteps()]);
}

function AppLayout({ children }) {
	// Applies the saved theme on every page; the picker itself is in Settings.
	useTheme();

	// iOS widget: kept in sync from every page, not just Today.
	useWidgetSync();

	// Update steps when the app opens and each time it comes back to the
	// foreground.
	useEffect(() => {
		function onVisible() {
			if (document.visibilityState === "visible") syncSteps();
		}
		syncSteps();
		document.addEventListener("visibilitychange", onVisible);
		return () => document.removeEventListener("visibilitychange", onVisible);
	}, []);
	return (
		<div className="app-layout">
			<Sidebar />
			<div className="main-content">
				<OfflineBanner />
				<PullToRefresh onRefresh={refreshScreen}>{children}</PullToRefresh>
			</div>
			<BottomTabBar />
		</div>
	);
}

export default function App() {
	const authenticated = useAuthStore((state) => state.authenticated);

	if (!authenticated) {
		return (
			<BrowserRouter>
				<Routes>
					<Route path="/" element={<Community />} />
					<Route path="/splash" element={<SplashPage />} />
					<Route path="/login" element={<Login />} />
					<Route path="/privacy" element={<PrivacyPolicy />} />
					<Route path="/leaderboard" element={<Navigate to="/" replace />} />
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</BrowserRouter>
		);
	}

	return (
		<BrowserRouter>
			<ScrollToTop />
			<AppLock>
				<AppLayout>
					<Routes>
						<Route path="/" element={<Navigate to="/today" replace />} />
						<Route path="/today" element={<Today />} />
						<Route path="/history/*" element={<History />} />
						<Route path="/progress/*" element={<Progress />} />
						<Route
							path="/weekly"
							element={<Navigate to="/history/weekly" replace />}
						/>
						<Route
							path="/total"
							element={<Navigate to="/history/total" replace />}
						/>
						<Route
							path="/strength"
							element={<Navigate to="/progress/strength" replace />}
						/>
						<Route path="/community" element={<Community />} />
						<Route
							path="/leaderboard"
							element={<Navigate to="/community" replace />}
						/>
						<Route path="/settings" element={<Settings />} />
						<Route path="/claude-setup" element={<ClaudeSetup />} />
						<Route path="/privacy" element={<PrivacyPolicy />} />
						<Route path="*" element={<Navigate to="/today" replace />} />
					</Routes>
				</AppLayout>
			</AppLock>
		</BrowserRouter>
	);
}
