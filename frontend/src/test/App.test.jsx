import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import App from "../App";
import useAuthStore from "../store/authStore";
import useNetworkStore from "../store/networkStore";

// Stub all page/layout components to keep tests fast and focused on routing
vi.mock("../pages/Community", () => ({
	default: () => <div>Community Page</div>,
}));
vi.mock("../pages/SplashPage", () => ({
	default: () => <div>Splash Page</div>,
}));
vi.mock("../pages/Login", () => ({ default: () => <div>Login Page</div> }));
vi.mock("../pages/Today", () => ({ default: () => <div>Today Page</div> }));
vi.mock("../pages/WeeklyStats", () => ({
	default: () => <div>Weekly Stats Page</div>,
}));
vi.mock("../pages/TotalStats", () => ({
	default: () => <div>Total Stats Page</div>,
}));
vi.mock("../pages/Strength", () => ({
	default: () => <div>Strength Page</div>,
}));
vi.mock("../pages/Settings", () => ({
	default: () => <div>Settings Page</div>,
}));
vi.mock("../pages/PrivacyPolicy", () => ({
	default: () => <div>Privacy Policy Page</div>,
}));
vi.mock("../components/layout/Sidebar", () => ({
	default: () => <nav>Sidebar</nav>,
}));
vi.mock("../components/layout/BottomTabBar", () => ({
	default: () => <nav>BottomTabBar</nav>,
}));
vi.mock("../native/health", () => ({
	isHealthSupported: vi.fn(() => false),
	isHealthConnected: vi.fn(() => false),
	isAutoStepsOn: vi.fn(() => false),
	syncHealth: vi.fn(() => Promise.resolve({ steps: 0, weights: 0 })),
}));

vi.mock("../hooks/useWidgetSync", () => ({ default: vi.fn() }));

const pullToRefresh = vi.hoisted(() => ({ onRefresh: null }));
vi.mock("../components/PullToRefresh", () => ({
	default: ({ onRefresh, children }) => {
		pullToRefresh.onRefresh = onRefresh;
		return children;
	},
}));
vi.mock("../hooks/useFetch", async (importOriginal) => ({
	...(await importOriginal()),
	refreshAll: vi.fn(() => Promise.resolve()),
}));

import * as health from "../native/health";
import useWidgetSync from "../hooks/useWidgetSync";
import { refreshAll } from "../hooks/useFetch";

beforeEach(() => {
	useAuthStore.setState({ authenticated: false, username: null });
});

describe("App routing — unauthenticated", () => {
	it("shows Community at / when not authenticated", () => {
		window.history.pushState({}, "", "/");
		render(<App />);
		expect(screen.getByText("Community Page")).toBeInTheDocument();
	});

	it("shows SplashPage at /splash when not authenticated", () => {
		window.history.pushState({}, "", "/splash");
		render(<App />);
		expect(screen.getByText("Splash Page")).toBeInTheDocument();
	});

	it("shows Login at /login when not authenticated", () => {
		window.history.pushState({}, "", "/login");
		render(<App />);
		expect(screen.getByText("Login Page")).toBeInTheDocument();
	});

	it("shows the privacy policy at /privacy when not authenticated", () => {
		window.history.pushState({}, "", "/privacy");
		render(<App />);
		expect(screen.getByText("Privacy Policy Page")).toBeInTheDocument();
	});

	it("does NOT show the app layout without authentication", () => {
		window.history.pushState({}, "", "/");
		render(<App />);
		expect(screen.queryByText("Sidebar")).not.toBeInTheDocument();
		expect(screen.queryByText("BottomTabBar")).not.toBeInTheDocument();
	});
});

describe("App routing — authenticated", () => {
	beforeEach(() => {
		useAuthStore.setState({ authenticated: true, username: "alice" });
	});

	it("shows the app layout (Sidebar + BottomTabBar, no top brand bar) when authenticated", () => {
		render(<App />);
		expect(screen.getByText("Sidebar")).toBeInTheDocument();
		expect(screen.getByText("BottomTabBar")).toBeInTheDocument();
	});

	it("shows the offline banner in the app layout when offline", () => {
		useNetworkStore.setState({ offline: true });
		render(<App />);
		expect(screen.getByText("You're offline")).toBeInTheDocument();
	});

	it("does NOT show Login page when authenticated", () => {
		render(<App />);
		expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
	});

	it("renders Today page at the default route", () => {
		render(<App />);
		expect(screen.getByText("Today Page")).toBeInTheDocument();
	});

	it("routes History to weekly stats by default", async () => {
		window.history.pushState({}, "", "/history");
		render(<App />);
		expect(await screen.findByText("Weekly Stats Page")).toBeInTheDocument();
		const views = screen.getByRole("group", { name: "History views" });
		expect(within(views).getByRole("button", { name: "Week" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(
			within(views).getByRole("button", { name: "Month" }),
		).toHaveAttribute("aria-pressed", "false");
	});

	it("routes History total tab to total stats", async () => {
		window.history.pushState({}, "", "/history/total");
		render(<App />);
		expect(await screen.findByText("Total Stats Page")).toBeInTheDocument();
	});

	it("routes Progress to strength by default", async () => {
		window.history.pushState({}, "", "/progress");
		render(<App />);
		expect(await screen.findByText("Strength Page")).toBeInTheDocument();
		expect(window.location.pathname).toBe("/progress/strength");
		expect(
			screen.queryByRole("link", { name: "Cardio" }),
		).not.toBeInTheDocument();
	});

	it("redirects the removed cardio progress URL to strength", async () => {
		window.history.pushState({}, "", "/progress/cardio");
		render(<App />);
		expect(await screen.findByText("Strength Page")).toBeInTheDocument();
		expect(window.location.pathname).toBe("/progress/strength");
	});

	it("keeps old progress URLs working through redirects", async () => {
		window.history.pushState({}, "", "/strength");
		render(<App />);
		expect(await screen.findByText("Strength Page")).toBeInTheDocument();
	});

	it("shows the privacy policy at /privacy when authenticated", () => {
		window.history.pushState({}, "", "/privacy");
		render(<App />);
		expect(screen.getByText("Privacy Policy Page")).toBeInTheDocument();
	});
});

describe("App routing — auth store reactivity", () => {
	it("switches from Community to app layout when authenticated", async () => {
		window.history.pushState({}, "", "/");
		render(<App />);
		expect(screen.getByText("Community Page")).toBeInTheDocument();

		// Simulate login
		useAuthStore.setState({ authenticated: true, username: "bob" });

		// App re-renders based on Zustand subscription; / redirects to /today
		await screen.findByText("Today Page");
		expect(screen.queryByText("Community Page")).not.toBeInTheDocument();
	});
});

describe("App theme", () => {
	it("applies the saved dark theme on any logged-in page", () => {
		localStorage.setItem("theme", "dark");
		document.documentElement.classList.remove("dark");
		useAuthStore.setState({ authenticated: true, username: "alice" });
		window.history.pushState({}, "", "/today");
		render(<App />);
		expect(document.documentElement).toHaveClass("dark");
		localStorage.removeItem("theme");
		document.documentElement.classList.remove("dark");
	});
});

describe("App — Apple Health auto-sync", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		useAuthStore.setState({ authenticated: true, username: "alice" });
		window.history.pushState({}, "", "/today");
	});

	afterEach(() => {
		delete document.visibilityState;
		health.isHealthSupported.mockReturnValue(false);
		health.isHealthConnected.mockReturnValue(false);
		health.isAutoStepsOn.mockReturnValue(false);
		health.syncHealth.mockImplementation(() =>
			Promise.resolve({ steps: 0, weights: 0 }),
		);
	});

	function connected({ auto }) {
		health.isHealthSupported.mockReturnValue(true);
		health.isHealthConnected.mockReturnValue(true);
		health.isAutoStepsOn.mockReturnValue(auto);
	}

	it("updates the last 7 days of steps on launch when automatic updates are on", () => {
		connected({ auto: true });
		render(<App />);
		expect(health.syncHealth).toHaveBeenCalledWith(7, { weights: false });
	});

	it("does nothing when automatic updates are off", () => {
		connected({ auto: false });
		render(<App />);
		expect(health.syncHealth).not.toHaveBeenCalled();
	});

	it("does nothing when Apple Health isn't connected", () => {
		health.isHealthSupported.mockReturnValue(true);
		health.isAutoStepsOn.mockReturnValue(true);
		render(<App />);
		expect(health.syncHealth).not.toHaveBeenCalled();
	});

	it("does nothing outside the iOS app even if settings were saved", () => {
		health.isHealthConnected.mockReturnValue(true);
		health.isAutoStepsOn.mockReturnValue(true);
		render(<App />);
		expect(health.syncHealth).not.toHaveBeenCalled();
	});

	function returnToApp() {
		Object.defineProperty(document, "visibilityState", {
			configurable: true,
			get: () => "visible",
		});
		document.dispatchEvent(new Event("visibilitychange"));
	}

	it("updates steps again each time the app comes back to the foreground", () => {
		connected({ auto: true });
		render(<App />);
		returnToApp();
		returnToApp();
		expect(health.syncHealth).toHaveBeenCalledTimes(3);
		expect(health.syncHealth).toHaveBeenLastCalledWith(7, { weights: false });
	});

	it("does not update steps when the app goes to the background", () => {
		connected({ auto: true });
		render(<App />);
		Object.defineProperty(document, "visibilityState", {
			configurable: true,
			get: () => "hidden",
		});
		document.dispatchEvent(new Event("visibilitychange"));
		expect(health.syncHealth).toHaveBeenCalledTimes(1);
	});

	it("does not update steps on return when automatic updates are off", () => {
		connected({ auto: false });
		render(<App />);
		returnToApp();
		expect(health.syncHealth).not.toHaveBeenCalled();
	});

	it("checks the setting again on return, so turning it on takes effect", () => {
		connected({ auto: false });
		render(<App />);
		health.isAutoStepsOn.mockReturnValue(true);
		returnToApp();
		expect(health.syncHealth).toHaveBeenCalledTimes(1);
	});

	it("stops listening once signed out", () => {
		connected({ auto: true });
		render(<App />);
		act(() => useAuthStore.setState({ authenticated: false, username: null }));
		returnToApp();
		expect(health.syncHealth).toHaveBeenCalledTimes(1);
	});

	it("keeps the app working when the background update fails", async () => {
		connected({ auto: true });
		health.syncHealth.mockRejectedValue(new Error("Health unavailable"));
		render(<App />);
		expect(await screen.findByText("Today Page")).toBeInTheDocument();
	});
});

describe("App — home-screen widget", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		useAuthStore.setState({ authenticated: true, username: "alice" });
	});

	it("keeps the widget in sync on pages other than Today", () => {
		window.history.pushState({}, "", "/settings");
		render(<App />);
		expect(screen.getByText("Settings Page")).toBeInTheDocument();
		expect(useWidgetSync).toHaveBeenCalled();
	});

	it("does not feed the widget when signed out", () => {
		useAuthStore.setState({ authenticated: false, username: null });
		window.history.pushState({}, "", "/");
		render(<App />);
		expect(useWidgetSync).not.toHaveBeenCalled();
	});
});

describe("App — pull to refresh", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		pullToRefresh.onRefresh = null;
		useAuthStore.setState({ authenticated: true, username: "alice" });
		window.history.pushState({}, "", "/today");
	});

	afterEach(() => {
		health.isHealthSupported.mockReturnValue(false);
		health.isHealthConnected.mockReturnValue(false);
		health.isAutoStepsOn.mockReturnValue(false);
	});

	it("reloads the data on screen", async () => {
		render(<App />);
		await act(() => pullToRefresh.onRefresh());
		expect(refreshAll).toHaveBeenCalledTimes(1);
	});

	it("also pulls new steps from Apple Health when automatic updates are on", async () => {
		health.isHealthSupported.mockReturnValue(true);
		health.isHealthConnected.mockReturnValue(true);
		health.isAutoStepsOn.mockReturnValue(true);
		render(<App />);
		health.syncHealth.mockClear();

		await act(() => pullToRefresh.onRefresh());

		expect(health.syncHealth).toHaveBeenCalledWith(7, { weights: false });
	});

	it("leaves Apple Health alone when automatic updates are off", async () => {
		render(<App />);
		await act(() => pullToRefresh.onRefresh());
		expect(health.syncHealth).not.toHaveBeenCalled();
	});
});
