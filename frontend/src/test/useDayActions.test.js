import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { ToastProvider } from "../components/Toast";
import { useDayActions } from "../hooks/useDayActions";

vi.mock("../api", () => ({
	default: { delete: vi.fn(), patch: vi.fn(), post: vi.fn() },
}));

import api from "../api";

const wrapper = ({ children }) =>
	React.createElement(ToastProvider, null, children);

const baseArgs = {
	date: "2026-06-02",
	onRefetchN: vi.fn(),
	onRefetchWo: vi.fn(),
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe("useDayActions error surfacing", () => {
	it("shows an error toast when submitRename fails", async () => {
		api.patch.mockRejectedValueOnce(new Error("500"));

		const { result } = renderHook(
			() => useDayActions({ ...baseArgs, workoutEntry: { id: 7 } }),
			{ wrapper },
		);

		await act(async () => {
			await result.current.submitRename();
		});

		expect(document.querySelector('[role="status"]')?.textContent).toMatch(
			/workout/i,
		);
	});

	it("does not show a toast on success", async () => {
		api.patch.mockResolvedValueOnce({});

		const { result } = renderHook(
			() => useDayActions({ ...baseArgs, workoutEntry: { id: 7 } }),
			{ wrapper },
		);

		await act(async () => {
			await result.current.submitRename();
		});

		expect(api.patch).toHaveBeenCalledWith("/workouts/7/name", {
			sessionName: null,
		});
		expect(document.querySelector('[role="status"]')).toBeNull();
	});
});

describe("useDayActions — creating the day's nutrition log", () => {
	it("returns null with no toast when offline (the meal sheet says so)", async () => {
		api.post.mockRejectedValueOnce({ code: "ERR_NETWORK" });
		const { result } = renderHook(() => useDayActions(baseArgs), { wrapper });
		let id;
		await act(async () => {
			id = await result.current.getOrCreateNutritionLogId();
		});
		expect(id).toBeNull();
		expect(document.querySelector('[role="status"]')).toBeNull();
	});

	it("returns null and shows a toast for other failures", async () => {
		api.post.mockRejectedValueOnce(new Error("500"));
		const { result } = renderHook(() => useDayActions(baseArgs), { wrapper });
		let id;
		await act(async () => {
			id = await result.current.getOrCreateNutritionLogId();
		});
		expect(id).toBeNull();
		expect(document.querySelector('[role="status"]')?.textContent).toMatch(
			/nutrition log/i,
		);
	});
});
