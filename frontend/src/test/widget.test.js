import { describe, expect, it, vi, beforeEach } from "vitest";

const bridge = vi.hoisted(() => ({
	update: vi.fn(() => Promise.resolve()),
	clear: vi.fn(() => Promise.resolve()),
}));
const platform = vi.hoisted(() => ({ native: true, name: "ios" }));

vi.mock("@capacitor/core", () => ({
	Capacitor: {
		isNativePlatform: () => platform.native,
		getPlatform: () => platform.name,
	},
	registerPlugin: () => bridge,
}));

import useAuthStore from "../store/authStore";
import { updateWidget } from "../native/widget";

const TOTALS = {
	date: "2026-04-10",
	calories: 1800,
	calorieGoal: 2600,
	protein: 120,
	proteinGoal: 180,
	steps: 6500,
	stepsGoal: 10000,
};

beforeEach(() => {
	vi.clearAllMocks();
	platform.native = true;
	platform.name = "ios";
	// Reset the "last sent" memory between tests.
	useAuthStore.setState({ authenticated: true, username: "alice" });
	useAuthStore.setState({ authenticated: false, username: null });
	vi.clearAllMocks();
});

describe("updateWidget", () => {
	it("does nothing in a browser", () => {
		platform.native = false;
		platform.name = "web";
		updateWidget(TOTALS);
		expect(bridge.update).not.toHaveBeenCalled();
	});

	it("sends today's totals to the widget in the iOS app", () => {
		updateWidget(TOTALS);
		expect(bridge.update).toHaveBeenCalledWith(TOTALS);
	});

	it("skips sending the same totals twice in a row", () => {
		updateWidget(TOTALS);
		updateWidget({ ...TOTALS });
		expect(bridge.update).toHaveBeenCalledTimes(1);

		updateWidget({ ...TOTALS, steps: 7000 });
		expect(bridge.update).toHaveBeenCalledTimes(2);
	});

	it("tries again with the same totals after a failed send", async () => {
		bridge.update.mockRejectedValueOnce(new Error("no app group"));
		updateWidget(TOTALS);
		await new Promise((r) => setTimeout(r, 0)); // let the failure reset the dedupe
		updateWidget(TOTALS);
		expect(bridge.update).toHaveBeenCalledTimes(2);
	});

	it("does nothing in the Android app", () => {
		platform.name = "android";
		updateWidget(TOTALS);
		expect(bridge.update).not.toHaveBeenCalled();
	});
});

describe("switching accounts", () => {
	it("clears the widget when a different account signs in", () => {
		useAuthStore.setState({ authenticated: true, username: "alice" });
		updateWidget(TOTALS);
		vi.clearAllMocks();

		useAuthStore.setState({ authenticated: true, username: "bob" });

		expect(bridge.clear).toHaveBeenCalledTimes(1);
		updateWidget(TOTALS);
		expect(bridge.update).toHaveBeenCalledTimes(1);
	});

	it("leaves the widget alone when the same user's state is set again", () => {
		useAuthStore.setState({ authenticated: true, username: "alice" });
		updateWidget(TOTALS);
		vi.clearAllMocks();

		useAuthStore.setState({ authenticated: true, username: "alice" });

		expect(bridge.clear).not.toHaveBeenCalled();
		updateWidget(TOTALS);
		expect(bridge.update).not.toHaveBeenCalled();
	});
});

describe("logging out", () => {
	it("clears the widget so it doesn't show the last person's day", () => {
		useAuthStore.setState({ authenticated: true, username: "alice" });
		updateWidget(TOTALS);

		useAuthStore.setState({ authenticated: false, username: null });

		expect(bridge.clear).toHaveBeenCalled();
		updateWidget(TOTALS);
		expect(bridge.update).toHaveBeenCalledTimes(2);
	});

	it("does not call the native plugin on logout in a browser", () => {
		platform.native = false;
		platform.name = "web";
		useAuthStore.setState({ authenticated: true, username: "alice" });
		useAuthStore.setState({ authenticated: false, username: null });
		expect(bridge.clear).not.toHaveBeenCalled();
	});
});
