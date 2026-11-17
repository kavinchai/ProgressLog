import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../components/Toast";
import useDeleteWithUndo from "../hooks/useDeleteWithUndo";

vi.mock("../components/Toast.css", () => ({}));
vi.mock("../api", () => ({ default: { post: vi.fn() } }));
vi.mock("../native/haptics", () => ({ tapDelete: vi.fn() }));

import api from "../api";
import { tapDelete } from "../native/haptics";

let deleteWithUndo;
function Harness() {
	deleteWithUndo = useDeleteWithUndo();
	return null;
}

function renderHarness() {
	render(
		<ToastProvider>
			<Harness />
		</ToastProvider>,
	);
}

beforeEach(() => vi.clearAllMocks());

describe("useDeleteWithUndo", () => {
	it("deletes straight away and offers Undo", async () => {
		renderHarness();
		const remove = vi.fn(() => Promise.resolve());
		const refresh = vi.fn();

		await act(() =>
			deleteWithUndo({ remove, message: "Weight deleted", refresh }),
		);

		expect(remove).toHaveBeenCalledTimes(1);
		expect(refresh).toHaveBeenCalledTimes(1);
		expect(tapDelete).toHaveBeenCalledTimes(1);
		expect(screen.getByText("Weight deleted")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
	});

	it("Undo restores it and refreshes", async () => {
		api.post.mockResolvedValue({});
		renderHarness();
		const refresh = vi.fn();
		await act(() =>
			deleteWithUndo({
				remove: () => Promise.resolve(),
				message: "Weight deleted",
				refresh,
			}),
		);

		await userEvent.click(screen.getByRole("button", { name: "Undo" }));

		expect(api.post).toHaveBeenCalledWith("/undo");
		await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
		expect(screen.queryByText("Weight deleted")).toBeNull();
	});

	it("only offers Undo for the latest delete", async () => {
		renderHarness();
		const remove = () => Promise.resolve();
		await act(() =>
			deleteWithUndo({ remove, message: "Weight deleted", refresh: vi.fn() }),
		);
		await act(() =>
			deleteWithUndo({ remove, message: "Steps deleted", refresh: vi.fn() }),
		);

		expect(screen.queryByText("Weight deleted")).toBeNull();
		expect(screen.getByText("Steps deleted")).toBeInTheDocument();
		expect(screen.getAllByRole("button", { name: "Undo" })).toHaveLength(1);
	});

	it("shows an error and changes nothing when the delete fails", async () => {
		renderHarness();
		const refresh = vi.fn();
		await act(() =>
			deleteWithUndo({
				remove: () => Promise.reject(new Error("500")),
				message: "Weight deleted",
				refresh,
			}),
		);

		expect(refresh).not.toHaveBeenCalled();
		expect(tapDelete).not.toHaveBeenCalled();
		expect(screen.getByText("Couldn't delete. Try again.")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
	});

	it("says so when Undo fails", async () => {
		api.post.mockRejectedValue(new Error("500"));
		renderHarness();
		await act(() =>
			deleteWithUndo({
				remove: () => Promise.resolve(),
				message: "Weight deleted",
				refresh: vi.fn(),
			}),
		);

		await userEvent.click(screen.getByRole("button", { name: "Undo" }));

		expect(
			await screen.findByText("Couldn't undo. Try again."),
		).toBeInTheDocument();
	});
});
