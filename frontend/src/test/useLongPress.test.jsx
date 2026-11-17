import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import useLongPress from "../hooks/useLongPress";

vi.mock("../native/haptics", () => ({ tapLight: vi.fn() }));
import { tapLight } from "../native/haptics";

function Pressable({ onLongPress }) {
	const handlers = useLongPress(onLongPress);
	return <div {...handlers}>press me</div>;
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

function press(target, { moveTo, holdMs }) {
	fireEvent.touchStart(target, { touches: [{ clientX: 100, clientY: 100 }] });
	if (moveTo)
		fireEvent.touchMove(target, {
			touches: [{ clientX: moveTo[0], clientY: moveTo[1] }],
		});
	act(() => vi.advanceTimersByTime(holdMs));
	fireEvent.touchEnd(target, { touches: [] });
}

describe("useLongPress", () => {
	it("fires after a press and hold, with a light tap", () => {
		const onLongPress = vi.fn();
		render(<Pressable onLongPress={onLongPress} />);
		press(screen.getByText("press me"), { holdMs: 600 });
		expect(onLongPress).toHaveBeenCalledTimes(1);
		expect(tapLight).toHaveBeenCalledTimes(1);
	});

	it("doesn't fire for a quick tap", () => {
		const onLongPress = vi.fn();
		render(<Pressable onLongPress={onLongPress} />);
		press(screen.getByText("press me"), { holdMs: 200 });
		act(() => vi.advanceTimersByTime(600));
		expect(onLongPress).not.toHaveBeenCalled();
	});

	it("doesn't fire when the finger moves (scrolling)", () => {
		const onLongPress = vi.fn();
		render(<Pressable onLongPress={onLongPress} />);
		press(screen.getByText("press me"), { moveTo: [100, 140], holdMs: 600 });
		expect(onLongPress).not.toHaveBeenCalled();
	});
});
