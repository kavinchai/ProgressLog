import { describe, expect, it, vi, beforeEach } from "vitest";

const plugin = vi.hoisted(() => ({
	isAvailable: vi.fn(),
	requestAuthorization: vi.fn(),
	dailySteps: vi.fn(),
	dailyWeights: vi.fn(),
}));
const platform = vi.hoisted(() => ({ native: false, name: "web" }));

vi.mock("@capacitor/core", () => ({
	Capacitor: {
		isNativePlatform: () => platform.native,
		getPlatform: () => platform.name,
	},
	registerPlugin: () => plugin,
}));
vi.mock("../api", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("../hooks/useFetch", () => ({
	refreshEndpoint: vi.fn(),
	clearFetchCache: vi.fn(),
}));

import api from "../api";
import useAuthStore from "../store/authStore";
import { refreshEndpoint } from "../hooks/useFetch";
import {
	connectHealth,
	isHealthConnected,
	isHealthSupported,
	lastHealthSync,
	syncHealth,
} from "../native/health";

beforeEach(() => {
	vi.clearAllMocks();
	localStorage.clear();
	platform.native = true;
	platform.name = "ios";
	plugin.isAvailable.mockResolvedValue({ available: true });
	plugin.requestAuthorization.mockResolvedValue({});
	plugin.dailySteps.mockResolvedValue({
		days: [{ date: "2026-11-12", steps: 9000 }],
	});
	plugin.dailyWeights.mockResolvedValue({
		days: [{ date: "2026-11-12", pounds: 181.2 }],
	});
	api.get.mockImplementation((url) =>
		Promise.resolve({
			data: url === "/steps" ? [{ logDate: "2026-11-12", steps: 9000 }] : [],
		}),
	);
	api.post.mockResolvedValue({});
});

describe("isHealthSupported", () => {
	it("is false in a browser", () => {
		platform.native = false;
		platform.name = "web";
		expect(isHealthSupported()).toBe(false);
	});

	it("is true in the iOS app", () => {
		expect(isHealthSupported()).toBe(true);
	});
});

describe("syncHealth", () => {
	it("reads Health, writes only what changed and refreshes steps and weight", async () => {
		const result = await syncHealth(7);

		expect(plugin.dailySteps).toHaveBeenCalledWith({ days: 7 });
		expect(plugin.dailyWeights).toHaveBeenCalledWith({ days: 7 });
		expect(api.post).toHaveBeenCalledTimes(1);
		expect(api.post).toHaveBeenCalledWith("/weight", {
			logDate: "2026-11-12",
			weightLbs: 181.2,
		});
		expect(refreshEndpoint).toHaveBeenCalledWith("/steps");
		expect(refreshEndpoint).toHaveBeenCalledWith("/weight");
		expect(result).toEqual({ steps: 0, weights: 1 });
	});
});

describe("connectHealth", () => {
	it("asks for permission, imports 30 days and remembers the connection", async () => {
		expect(isHealthConnected()).toBe(false);

		await connectHealth();

		expect(plugin.requestAuthorization).toHaveBeenCalled();
		expect(plugin.dailySteps).toHaveBeenCalledWith({ days: 30 });
		expect(isHealthConnected()).toBe(true);
	});

	it("does not connect when Health is unavailable", async () => {
		plugin.isAvailable.mockResolvedValue({ available: false });

		await expect(connectHealth()).rejects.toThrow(/not available/i);
		expect(isHealthConnected()).toBe(false);
	});
});

describe("syncHealth — more cases", () => {
	it("writes steps for days whose totals changed", async () => {
		plugin.dailySteps.mockResolvedValue({
			days: [{ date: "2026-11-12", steps: 12000 }],
		});
		await syncHealth(7);
		expect(api.post).toHaveBeenCalledWith("/steps", {
			logDate: "2026-11-12",
			steps: 12000,
		});
	});

	it("records when it last synced", async () => {
		expect(lastHealthSync()).toBeNull();
		await syncHealth(7);
		expect(lastHealthSync()).not.toBeNull();
	});

	it("stops and does not record a sync when saving fails", async () => {
		api.post.mockRejectedValue(new Error("Network Error"));
		await expect(syncHealth(7)).rejects.toThrow("Network Error");
		expect(lastHealthSync()).toBeNull();
		expect(refreshEndpoint).not.toHaveBeenCalled();
	});
});

describe("connectHealth — failures", () => {
	it("stays disconnected when permission is refused", async () => {
		plugin.requestAuthorization.mockRejectedValue(new Error("Denied"));
		await expect(connectHealth()).rejects.toThrow("Denied");
		expect(isHealthConnected()).toBe(false);
	});
});

describe("logging out", () => {
	it("forgets the Apple Health connection so the next account doesn't import it", async () => {
		useAuthStore.setState({ authenticated: true, username: "alice" });
		await connectHealth();
		expect(isHealthConnected()).toBe(true);

		useAuthStore.setState({ authenticated: false, username: null });

		expect(isHealthConnected()).toBe(false);
		expect(lastHealthSync()).toBeNull();
	});
});
