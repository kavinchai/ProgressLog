import { beforeEach, describe, expect, it, vi } from "vitest";
import useAuthStore from "../store/authStore";

// Re-import api after mocking so interceptors run with vi.fn() in place
vi.mock("axios", async (importOriginal) => {
	const actual = await importOriginal();
	return {
		default: {
			...actual.default,
			create: vi.fn(() => ({
				interceptors: {
					request: { use: vi.fn() },
					response: { use: vi.fn() },
				},
			})),
		},
	};
});

describe("api interceptors (unit)", () => {
	beforeEach(() => {
		useAuthStore.setState({ authenticated: false, username: null });
	});

	it("response interceptor logs out on 401", async () => {
		const { trackError } = await import("../api");
		useAuthStore.setState({ authenticated: true, username: "alice" });
		await expect(
			trackError({ response: { status: 401 } }),
		).rejects.toBeTruthy();
		expect(useAuthStore.getState().authenticated).toBe(false);
	});

	it("response interceptor does not log out on other errors", async () => {
		const { trackError } = await import("../api");
		useAuthStore.setState({ authenticated: true, username: "alice" });
		await expect(
			trackError({ response: { status: 500 } }),
		).rejects.toBeTruthy();
		expect(useAuthStore.getState().authenticated).toBe(true);
	});
});

describe("api — offline tracking", () => {
	it("a request that can't reach the server marks the app offline", async () => {
		const { trackError } = await import("../api");
		const useNetworkStore = (await import("../store/networkStore")).default;
		const error = { code: "ERR_NETWORK", message: "Network Error" };
		await expect(trackError(error)).rejects.toBe(error);
		expect(useNetworkStore.getState().offline).toBe(true);
	});

	it("any answer from the server, even an error, marks the app online", async () => {
		const { trackError, trackResponse } = await import("../api");
		const useNetworkStore = (await import("../store/networkStore")).default;

		useAuthStore.setState({ authenticated: true, username: "alice" });
		useNetworkStore.setState({ offline: true });
		await expect(
			trackError({ response: { status: 500 } }),
		).rejects.toBeTruthy();
		expect(useNetworkStore.getState().offline).toBe(false);
		expect(useAuthStore.getState().authenticated).toBe(true);

		useNetworkStore.setState({ offline: true });
		const response = { status: 200 };
		expect(trackResponse(response)).toBe(response);
		expect(useNetworkStore.getState().offline).toBe(false);
	});
});

describe("api — interceptor wiring", () => {
	it("runs every response through the offline and 401 tracking", async () => {
		const axios = (await import("axios")).default;
		const { default: api, trackError, trackResponse } = await import("../api");
		expect(axios.create).toHaveBeenCalled();
		expect(api.interceptors.response.use).toHaveBeenCalledWith(
			trackResponse,
			trackError,
		);
	});
});
