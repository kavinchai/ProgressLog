import { describe, expect, it, vi, beforeEach } from "vitest";

const haptics = vi.hoisted(() => ({
	notification: vi.fn(() => Promise.resolve()),
	impact: vi.fn(() => Promise.resolve()),
}));
const platform = vi.hoisted(() => ({ native: true, name: "ios" }));

vi.mock("@capacitor/core", () => ({
	Capacitor: {
		isNativePlatform: () => platform.native,
		getPlatform: () => platform.name,
	},
}));
vi.mock("@capacitor/haptics", () => ({
	Haptics: haptics,
	ImpactStyle: { Light: "LIGHT", Medium: "MEDIUM" },
	NotificationType: { Success: "SUCCESS" },
}));

import { tapDelete, tapLight, tapSuccess } from "../native/haptics";

beforeEach(() => {
	vi.clearAllMocks();
	platform.native = true;
	platform.name = "ios";
});

describe("haptics in the iOS app", () => {
	it("tapSuccess plays the success pattern", () => {
		tapSuccess();
		expect(haptics.notification).toHaveBeenCalledWith({ type: "SUCCESS" });
	});

	it("tapDelete plays a firm tap", () => {
		tapDelete();
		expect(haptics.impact).toHaveBeenCalledWith({ style: "MEDIUM" });
	});

	it("tapLight plays a light tap", () => {
		tapLight();
		expect(haptics.impact).toHaveBeenCalledWith({ style: "LIGHT" });
	});

	it("ignores a phone that can't play haptics", async () => {
		haptics.notification.mockRejectedValueOnce(new Error("unavailable"));
		expect(() => tapSuccess()).not.toThrow();
		await Promise.resolve();
	});
});

describe("haptics outside the iOS app", () => {
	it("does nothing in a browser", () => {
		platform.native = false;
		platform.name = "web";
		tapSuccess();
		tapDelete();
		tapLight();
		expect(haptics.notification).not.toHaveBeenCalled();
		expect(haptics.impact).not.toHaveBeenCalled();
	});
});
