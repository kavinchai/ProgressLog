import { describe, expect, it } from "vitest";
import { errorMessage } from "../utils/errors";
import useNetworkStore from "../store/networkStore";

describe("errorMessage", () => {
	it("says you're offline when the server can't be reached", () => {
		expect(errorMessage({ code: "ERR_NETWORK" }, "Failed to save.")).toBe(
			"You're offline. Connect to save this.",
		);
	});

	it("uses the given offline wording", () => {
		expect(
			errorMessage(
				{ code: "ERR_NETWORK" },
				"Couldn't delete.",
				"You're offline. Connect to delete this.",
			),
		).toBe("You're offline. Connect to delete this.");
	});

	it("says you're offline for any failure while the app is offline", () => {
		useNetworkStore.setState({ offline: true });
		expect(errorMessage(new Error("No nutrition log"), "Failed to save.")).toBe(
			"You're offline. Connect to save this.",
		);
	});

	it("shows the server's message, or the fallback", () => {
		expect(
			errorMessage({ response: { data: { message: "Too big" } } }, "Failed."),
		).toBe("Too big");
		expect(errorMessage({ response: { status: 500 } }, "Failed.")).toBe(
			"Failed.",
		);
	});
});
