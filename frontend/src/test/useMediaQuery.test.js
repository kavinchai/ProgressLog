import { describe, expect, it, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useMediaQuery from "../hooks/useMediaQuery";

const original = window.matchMedia;

function fakeMatchMedia(initial) {
	const listeners = new Set();
	const mql = {
		matches: initial,
		addEventListener: (_, fn) => listeners.add(fn),
		removeEventListener: (_, fn) => listeners.delete(fn),
	};
	window.matchMedia = () => mql;
	return {
		set(matches) {
			mql.matches = matches;
			listeners.forEach((fn) => fn({ matches }));
		},
		listeners,
	};
}

afterEach(() => {
	window.matchMedia = original;
});

describe("useMediaQuery", () => {
	it("is false when the browser has no matchMedia (e.g. jsdom)", () => {
		window.matchMedia = undefined;
		const { result } = renderHook(() => useMediaQuery("(max-width: 640px)"));
		expect(result.current).toBe(false);
	});

	it("returns the current match", () => {
		fakeMatchMedia(true);
		const { result } = renderHook(() => useMediaQuery("(max-width: 640px)"));
		expect(result.current).toBe(true);
	});

	it("updates when the viewport crosses the breakpoint and unsubscribes on unmount", () => {
		const mq = fakeMatchMedia(false);
		const { result, unmount } = renderHook(() =>
			useMediaQuery("(max-width: 640px)"),
		);
		act(() => mq.set(true));
		expect(result.current).toBe(true);
		unmount();
		expect(mq.listeners.size).toBe(0);
	});
});
