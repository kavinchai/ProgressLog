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
	onRefetchS: vi.fn(),
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe("useDayActions error surfacing", () => {
	it("shows an error toast when saveSteps fails", async () => {
		api.post.mockRejectedValueOnce(new Error("500"));

		const { result } = renderHook(
			() => useDayActions({ ...baseArgs, stepEntry: null }),
			{ wrapper },
		);

		await act(async () => {
			await result.current.saveSteps("5000");
		});

		expect(document.querySelector('[role="status"]')?.textContent).toMatch(
			/steps/i,
		);
	});

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
		api.post.mockResolvedValueOnce({});

		const { result } = renderHook(
			() => useDayActions({ ...baseArgs, stepEntry: null }),
			{ wrapper },
		);

		await act(async () => {
			await result.current.saveSteps("5000");
		});

		expect(document.querySelector('[role="status"]')).toBeNull();
	});
});
