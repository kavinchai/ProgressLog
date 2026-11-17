import { describe, expect, it, vi, beforeEach } from "vitest";

const plugin = vi.hoisted(() => ({
	biometryType: vi.fn(),
	unlock: vi.fn(),
	setPrivacyCover: vi.fn(() => Promise.resolve()),
}));
const platform = vi.hoisted(() => ({ ios: true }));

vi.mock("@capacitor/core", () => ({ registerPlugin: () => plugin }));
vi.mock("../native/platform", () => ({ isIOSApp: () => platform.ios }));

import {
	biometryType,
	isLockOn,
	setLockOn,
	syncPrivacyCover,
	unlockWithBiometrics,
} from "../native/biometricLock";

beforeEach(() => {
	vi.clearAllMocks();
	platform.ios = true;
	localStorage.clear();
});

describe("Face ID lock (native)", () => {
	it("reports the phone's biometry", async () => {
		plugin.biometryType.mockResolvedValue({ type: "faceID" });
		await expect(biometryType()).resolves.toBe("faceID");
	});

	it("reports none when the check fails", async () => {
		plugin.biometryType.mockRejectedValue(new Error("unavailable"));
		await expect(biometryType()).resolves.toBe("none");
	});

	it("unlocks only when Face ID or the passcode succeeds", async () => {
		plugin.unlock.mockResolvedValueOnce({ unlocked: true });
		await expect(unlockWithBiometrics("Unlock")).resolves.toBe(true);
		expect(plugin.unlock).toHaveBeenCalledWith({ reason: "Unlock" });

		plugin.unlock.mockResolvedValueOnce({ unlocked: false });
		await expect(unlockWithBiometrics("Unlock")).resolves.toBe(false);

		plugin.unlock.mockRejectedValueOnce(new Error("busy"));
		await expect(unlockWithBiometrics("Unlock")).resolves.toBe(false);
	});

	it("remembers the setting and covers the app switcher while it's on", () => {
		expect(isLockOn()).toBe(false);

		setLockOn(true);
		expect(isLockOn()).toBe(true);
		expect(plugin.setPrivacyCover).toHaveBeenLastCalledWith({ enabled: true });

		setLockOn(false);
		expect(isLockOn()).toBe(false);
		expect(plugin.setPrivacyCover).toHaveBeenLastCalledWith({ enabled: false });
	});

	it("tells the app about the saved setting on launch", () => {
		setLockOn(true);
		plugin.setPrivacyCover.mockClear();
		syncPrivacyCover();
		expect(plugin.setPrivacyCover).toHaveBeenCalledWith({ enabled: true });
	});
});

describe("Face ID lock outside the iPhone app", () => {
	it("does nothing in a browser", async () => {
		platform.ios = false;
		localStorage.setItem("progresslog-face-id-lock", "true");

		await expect(biometryType()).resolves.toBe("none");
		await expect(unlockWithBiometrics("Unlock")).resolves.toBe(false);
		expect(isLockOn()).toBe(false);
		syncPrivacyCover();
		expect(plugin.biometryType).not.toHaveBeenCalled();
		expect(plugin.unlock).not.toHaveBeenCalled();
		expect(plugin.setPrivacyCover).not.toHaveBeenCalled();
	});
});
