import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ToastProvider, useToast } from "../components/Toast";

function ErrorTrigger({ message = "boom" }) {
	const toast = useToast();
	return <button onClick={() => toast.error(message)}>fire</button>;
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("Toast", () => {
	it("renders nothing until a toast is fired", () => {
		render(
			<ToastProvider>
				<ErrorTrigger />
			</ToastProvider>,
		);
		expect(screen.queryByRole("status")).toBeNull();
	});

	it("shows an error toast when toast.error is called", () => {
		render(
			<ToastProvider>
				<ErrorTrigger message="Failed to delete workout" />
			</ToastProvider>,
		);
		act(() => {
			screen.getByText("fire").click();
		});
		expect(screen.getByRole("status")).toHaveTextContent(
			"Failed to delete workout",
		);
	});

	it("auto-dismisses after the timeout", () => {
		render(
			<ToastProvider>
				<ErrorTrigger />
			</ToastProvider>,
		);
		act(() => {
			screen.getByText("fire").click();
		});
		expect(screen.getByRole("status")).toBeInTheDocument();

		act(() => {
			vi.advanceTimersByTime(5000);
		});
		expect(screen.queryByRole("status")).toBeNull();
	});

	it("stacks multiple toasts up to a cap", () => {
		render(
			<ToastProvider>
				<ErrorTrigger message="a" />
			</ToastProvider>,
		);
		act(() => {
			screen.getByText("fire").click();
			screen.getByText("fire").click();
			screen.getByText("fire").click();
			screen.getByText("fire").click();
		});
		// Cap at 3 visible.
		expect(screen.getAllByRole("status")).toHaveLength(3);
	});

	it("throws if useToast is used outside a provider", () => {
		// Suppress React's error boundary noise.
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<ErrorTrigger />)).toThrow();
		spy.mockRestore();
	});

	it("keeps the status role off the dismiss button, which still dismisses", () => {
		render(
			<ToastProvider>
				<ErrorTrigger message="Failed to save meal" />
			</ToastProvider>,
		);
		act(() => {
			screen.getByText("fire").click();
		});
		const status = screen.getByRole("status");
		expect(status.tagName).not.toBe("BUTTON");
		act(() => {
			screen.getByRole("button", { name: /failed to save meal/i }).click();
		});
		expect(screen.queryByRole("status")).toBeNull();
	});
});
