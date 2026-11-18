import { describe, expect, it } from "vitest";
import useNetworkStore from "../store/networkStore";

describe("networkStore", () => {
	it("goes offline and back online with the phone's connection", () => {
		window.dispatchEvent(new Event("offline"));
		expect(useNetworkStore.getState().offline).toBe(true);
		window.dispatchEvent(new Event("online"));
		expect(useNetworkStore.getState().offline).toBe(false);
	});
});
