import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SwipeRow from "../components/SwipeRow";

vi.mock("../components/SwipeRow.css", () => ({}));
vi.mock("../components/MoreMenu.css", () => ({}));
vi.mock("../native/haptics", () => ({ tapLight: vi.fn() }));

import { tapLight } from "../native/haptics";

function renderRow(props = {}) {
	const onOpen = vi.fn();
	const onDelete = vi.fn();
	render(
		<SwipeRow
			label="Weight"
			openLabel="Edit weight"
			onOpen={onOpen}
			onDelete={onDelete}
			{...props}
		>
			<span>Weight</span>
			<span>185 lbs</span>
		</SwipeRow>,
	);
	return { onOpen, onDelete };
}

const main = () => screen.getByRole("button", { name: "Edit weight" });
// Hidden until swiped, so it has no accessible name to query by yet.
const swipeDelete = () => document.querySelector(".swipe-row-delete");

function swipe(el, ...xs) {
	fireEvent.touchStart(el, { touches: [{ clientX: 300, clientY: 100 }] });
	for (const x of xs)
		fireEvent.touchMove(el, { touches: [{ clientX: x, clientY: 102 }] });
	fireEvent.touchEnd(el, { touches: [] });
}

beforeEach(() => vi.clearAllMocks());

describe("SwipeRow — tap", () => {
	it("opens the entry when tapped", async () => {
		const { onOpen } = renderRow();
		await userEvent.click(main());
		expect(onOpen).toHaveBeenCalledTimes(1);
	});

	it("opens with the keyboard too", async () => {
		const { onOpen } = renderRow();
		main().focus();
		await userEvent.keyboard("{Enter}");
		expect(onOpen).toHaveBeenCalledTimes(1);
	});
});

describe("SwipeRow — swipe to delete", () => {
	it("reveals Delete after a swipe left, and Delete deletes", async () => {
		const { onDelete, onOpen } = renderRow();
		expect(swipeDelete()).toHaveAttribute("aria-hidden", "true");

		swipe(main(), 260, 200);

		expect(swipeDelete()).not.toHaveAttribute("aria-hidden", "true");
		expect(swipeDelete()).toHaveAccessibleName("Delete Weight");
		await userEvent.click(swipeDelete());
		expect(onDelete).toHaveBeenCalledTimes(1);
		expect(onOpen).not.toHaveBeenCalled();
	});

	it("springs back after a short swipe", () => {
		renderRow();
		swipe(main(), 285);
		expect(swipeDelete()).toHaveAttribute("aria-hidden", "true");
	});

	it("ignores a mostly vertical drag (scrolling)", () => {
		renderRow();
		fireEvent.touchStart(main(), { touches: [{ clientX: 300, clientY: 100 }] });
		fireEvent.touchMove(main(), { touches: [{ clientX: 270, clientY: 200 }] });
		fireEvent.touchEnd(main(), { touches: [] });
		expect(swipeDelete()).toHaveAttribute("aria-hidden", "true");
	});

	it("tapping an open row closes it instead of opening the entry", async () => {
		const { onOpen } = renderRow();
		swipe(main(), 260, 200);
		await userEvent.click(main());
		expect(onOpen).not.toHaveBeenCalled();
		expect(swipeDelete()).toHaveAttribute("aria-hidden", "true");
	});

	it("can't be swiped when there's nothing to delete", () => {
		renderRow({ onDelete: undefined });
		swipe(main(), 260, 200);
		expect(swipeDelete()).toBeNull();
	});
});

describe("SwipeRow — menu", () => {
	it("offers Edit and Delete in the ••• menu", async () => {
		const { onOpen, onDelete } = renderRow();
		const more = screen.getByRole("button", {
			name: "More actions for Weight",
		});

		await userEvent.click(more);
		await userEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
		expect(onOpen).toHaveBeenCalledTimes(1);

		await userEvent.click(more);
		await userEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
		expect(onDelete).toHaveBeenCalledTimes(1);
	});

	it("opens the menu on a long press, with a light tap", () => {
		vi.useFakeTimers();
		try {
			const { onOpen } = renderRow();
			fireEvent.touchStart(main(), {
				touches: [{ clientX: 300, clientY: 100 }],
			});
			act(() => vi.advanceTimersByTime(600));
			fireEvent.touchEnd(main(), { touches: [] });
			fireEvent.click(main());

			expect(screen.getByRole("menu")).toBeInTheDocument();
			expect(tapLight).toHaveBeenCalledTimes(1);
			expect(onOpen).not.toHaveBeenCalled();
		} finally {
			vi.useRealTimers();
		}
	});
});

afterEach(() => vi.useRealTimers());
