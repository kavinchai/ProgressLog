import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "../components/Modal";

vi.mock("../components/Modal.css", () => ({}));

describe("Modal", () => {
	it("renders the title", () => {
		render(
			<Modal title="Test Title" onClose={() => {}}>
				<p>content</p>
			</Modal>,
		);
		expect(screen.getByText(/Test Title/)).toBeInTheDocument();
	});

	it("renders children", () => {
		render(
			<Modal title="Title" onClose={() => {}}>
				<p>Hello World</p>
			</Modal>,
		);
		expect(screen.getByText("Hello World")).toBeInTheDocument();
	});

	it("calls onClose when the X button is clicked", async () => {
		const onClose = vi.fn();
		render(
			<Modal title="Title" onClose={onClose}>
				<p>content</p>
			</Modal>,
		);
		await userEvent.click(screen.getByRole("button", { name: /close/i }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("calls onClose when clicking the overlay", async () => {
		const onClose = vi.fn();
		const { container } = render(
			<Modal title="Title" onClose={onClose}>
				<p>content</p>
			</Modal>,
		);
		const overlay = container.querySelector(".modal-overlay");
		await userEvent.click(overlay);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("does NOT call onClose when clicking inside the modal box", async () => {
		const onClose = vi.fn();
		const { container } = render(
			<Modal title="Title" onClose={onClose}>
				<p>inside content</p>
			</Modal>,
		);
		const box = container.querySelector(".modal-box");
		await userEvent.click(box);
		expect(onClose).not.toHaveBeenCalled();
	});

	it("calls onClose when Escape key is pressed", () => {
		const onClose = vi.fn();
		render(
			<Modal title="Title" onClose={onClose}>
				<p>content</p>
			</Modal>,
		);
		fireEvent.keyDown(document, { key: "Escape" });
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("does NOT call onClose for other key presses", () => {
		const onClose = vi.fn();
		render(
			<Modal title="Title" onClose={onClose}>
				<p>content</p>
			</Modal>,
		);
		fireEvent.keyDown(document, { key: "Enter" });
		expect(onClose).not.toHaveBeenCalled();
	});
});

describe("Modal — native dialog", () => {
	it("renders its box as an open native <dialog> named by the title", () => {
		render(
			<Modal title="Log Weight" onClose={() => {}}>
				<p>content</p>
			</Modal>,
		);
		const dialog = screen.getByRole("dialog", { name: "Log Weight" });
		expect(dialog.tagName).toBe("DIALOG");
		expect(dialog).toHaveAttribute("open");
	});
});

describe("Modal — drag down to close", () => {
	function drag(el, ...ys) {
		fireEvent.touchStart(el, { touches: [{ clientY: 100 }] });
		for (const y of ys) fireEvent.touchMove(el, { touches: [{ clientY: y }] });
		fireEvent.touchEnd(el, { touches: [] });
	}

	function renderModal(onClose) {
		render(
			<Modal title="Log Weight" onClose={onClose}>
				<p>content</p>
			</Modal>,
		);
		return {
			dialog: screen.getByRole("dialog", { name: "Log Weight" }),
			header: screen.getByText("Log Weight"),
		};
	}

	it("closes when the header is dragged down far enough", () => {
		const onClose = vi.fn();
		const { header } = renderModal(onClose);
		drag(header, 150, 250);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("follows your finger while dragging", () => {
		const { dialog, header } = renderModal(vi.fn());
		fireEvent.touchStart(header, { touches: [{ clientY: 100 }] });
		fireEvent.touchMove(header, { touches: [{ clientY: 160 }] });
		expect(dialog.style.transform).toBe("translateY(60px)");
	});

	it("springs back after a short drag", () => {
		const onClose = vi.fn();
		const { dialog, header } = renderModal(onClose);
		drag(header, 130);
		expect(onClose).not.toHaveBeenCalled();
		expect(dialog.style.transform).toBe("");
	});

	it("doesn't move when dragged up", () => {
		const onClose = vi.fn();
		const { dialog, header } = renderModal(onClose);
		fireEvent.touchStart(header, { touches: [{ clientY: 100 }] });
		fireEvent.touchMove(header, { touches: [{ clientY: 20 }] });
		expect(dialog.style.transform).toBe("");
		fireEvent.touchEnd(header, { touches: [] });
		expect(onClose).not.toHaveBeenCalled();
	});

	it("doesn't close when you scroll the content", () => {
		const onClose = vi.fn();
		renderModal(onClose);
		drag(screen.getByText("content"), 250, 400);
		expect(onClose).not.toHaveBeenCalled();
	});
});
