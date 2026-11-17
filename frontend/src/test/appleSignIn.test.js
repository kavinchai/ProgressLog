import { describe, expect, it, vi, beforeEach } from "vitest";

const plugin = vi.hoisted(() => ({ authorize: vi.fn() }));
const platform = vi.hoisted(() => ({ ios: true }));

vi.mock("@capacitor/core", () => ({ registerPlugin: () => plugin }));
vi.mock("../native/platform", () => ({ isIOSApp: () => platform.ios }));

import { isAppleSignInAvailable, signInWithApple } from "../native/appleSignIn";

const CREDS = {
	identityToken: "id-token",
	authorizationCode: "code",
	givenName: "Kav",
	email: "",
};

beforeEach(() => {
	vi.clearAllMocks();
	platform.ios = true;
});

describe("Sign in with Apple (native)", () => {
	it("is only offered in the iPhone app", () => {
		expect(isAppleSignInAvailable()).toBe(true);
		platform.ios = false;
		expect(isAppleSignInAvailable()).toBe(false);
	});

	it("returns what Apple's sheet returned", async () => {
		plugin.authorize.mockResolvedValue(CREDS);
		await expect(signInWithApple()).resolves.toEqual(CREDS);
	});

	it("returns null when the person cancels the sheet", async () => {
		plugin.authorize.mockRejectedValue({ code: "canceled" });
		await expect(signInWithApple()).resolves.toBeNull();
	});

	it("passes on other failures", async () => {
		plugin.authorize.mockRejectedValue(new Error("No network"));
		await expect(signInWithApple()).rejects.toThrow("No network");
	});
});
