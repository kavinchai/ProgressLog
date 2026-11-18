import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StepsModal from "../components/StepsModal";

vi.mock("../api", () => ({ default: { post: vi.fn() } }));
vi.mock("../components/Modal.css", () => ({}));
vi.mock("../native/haptics", () => ({ tapSuccess: vi.fn() }));

import api from "../api";
import { tapSuccess } from "../native/haptics";

const onClose = vi.fn();
const onSaved = vi.fn();

function renderModal(props = {}) {
	return render(
		<StepsModal
			prefillDate="2026-01-05"
			onClose={onClose}
			onSaved={onSaved}
			{...props}
		/>,
	);
}

beforeEach(() => vi.clearAllMocks());

describe("StepsModal", () => {
	it("opens as Log Steps with the date filled in and steps empty", () => {
		renderModal();
		expect(
			screen.getByRole("dialog", { name: "Log Steps" }),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Date")).toHaveValue("2026-01-05");
		expect(screen.getByLabelText("Steps")).toHaveValue(null);
		expect(screen.getByLabelText("Steps")).toHaveAttribute("type", "number");
	});

	it("opens as Edit Steps filled in from an existing entry", () => {
		renderModal({ existing: { id: 3, logDate: "2026-01-03", steps: 8000 } });
		expect(
			screen.getByRole("dialog", { name: "Edit Steps" }),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Date")).toHaveValue("2026-01-03");
		expect(screen.getByLabelText("Steps")).toHaveValue(8000);
	});

	it("Save POSTs the steps, taps, refreshes and closes", async () => {
		api.post.mockResolvedValue({});
		renderModal();
		await userEvent.type(screen.getByLabelText("Steps"), "9500");
		await userEvent.click(screen.getByRole("button", { name: "Save" }));
		await waitFor(() =>
			expect(api.post).toHaveBeenCalledWith("/steps", {
				logDate: "2026-01-05",
				steps: 9500,
			}),
		);
		expect(tapSuccess).toHaveBeenCalledTimes(1);
		expect(onSaved).toHaveBeenCalledTimes(1);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("shows the server's message and stays open when saving fails", async () => {
		api.post.mockRejectedValue({
			response: { data: { message: "Steps must be positive" } },
		});
		renderModal();
		await userEvent.type(screen.getByLabelText("Steps"), "5");
		await userEvent.click(screen.getByRole("button", { name: "Save" }));
		expect(
			await screen.findByText("Steps must be positive"),
		).toBeInTheDocument();
		expect(onSaved).not.toHaveBeenCalled();
		expect(onClose).not.toHaveBeenCalled();
	});

	it("says you're offline and keeps what you typed when there's no connection", async () => {
		api.post.mockRejectedValue({
			code: "ERR_NETWORK",
			message: "Network Error",
		});
		renderModal();
		await userEvent.type(screen.getByLabelText("Steps"), "8500");
		await userEvent.click(screen.getByRole("button", { name: "Save" }));
		expect(
			await screen.findByText("You're offline. Connect to save this."),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Steps")).toHaveValue(8500);
		expect(onClose).not.toHaveBeenCalled();
	});

	it("won't save with no steps entered (delete is a swipe instead)", async () => {
		renderModal();
		await userEvent.click(screen.getByRole("button", { name: "Save" }));
		expect(api.post).not.toHaveBeenCalled();
		expect(onClose).not.toHaveBeenCalled();
	});

	it("Cancel closes without saving", async () => {
		renderModal();
		await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(api.post).not.toHaveBeenCalled();
	});

	it("saves only once if submitted twice quickly", () => {
		api.post.mockReturnValue(new Promise(() => {}));
		const { container } = renderModal();
		fireEvent.change(screen.getByLabelText("Steps"), {
			target: { value: "100" },
		});
		const form = container.querySelector("form");
		fireEvent.submit(form);
		fireEvent.submit(form);
		expect(api.post).toHaveBeenCalledTimes(1);
	});
});
