import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";

vi.mock("../api", () => ({ default: { post: vi.fn() } }));
vi.mock("../components/Modal.css", () => ({}));
vi.mock("../native/haptics", () => ({ tapDelete: vi.fn() }));

import { tapDelete } from "../native/haptics";

beforeEach(() => {
	vi.clearAllMocks();
});

function renderModal(onDelete) {
	render(
		<ConfirmDeleteModal
			title="Delete Meal"
			message="Delete this meal?"
			onClose={vi.fn()}
			onDelete={onDelete}
		/>,
	);
}

describe("ConfirmDeleteModal — haptics", () => {
	it("gives a firm tap once the delete goes through", async () => {
		renderModal(vi.fn(() => Promise.resolve()));
		await userEvent.click(
			screen.getByRole("button", { name: /confirm delete/i }),
		);
		await screen.findByText(/deleted successfully/i);
		expect(tapDelete).toHaveBeenCalledTimes(1);
	});

	it("gives no tap when the delete fails", async () => {
		renderModal(vi.fn(() => Promise.reject(new Error("500"))));
		await userEvent.click(
			screen.getByRole("button", { name: /confirm delete/i }),
		);
		await waitFor(() =>
			expect(screen.getByText(/delete failed/i)).toBeInTheDocument(),
		);
		expect(tapDelete).not.toHaveBeenCalled();
	});
});
