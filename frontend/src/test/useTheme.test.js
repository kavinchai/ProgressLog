import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useTheme from "../hooks/useTheme";

beforeEach(() => {
	localStorage.clear();
	document.documentElement.classList.remove("dark");
});

afterEach(() => {
	localStorage.clear();
	document.documentElement.classList.remove("dark");
});

describe("useTheme", () => {
	it("defaults to light mode when localStorage has no theme", () => {
		const { result } = renderHook(() => useTheme());
		expect(result.current[0]).toBe(false);
	});

	it('starts in dark mode when localStorage has "dark"', () => {
		localStorage.setItem("theme", "dark");
		const { result } = renderHook(() => useTheme());
		expect(result.current[0]).toBe(true);
	});

	it('starts in light mode when localStorage has "light"', () => {
		localStorage.setItem("theme", "light");
		const { result } = renderHook(() => useTheme());
		expect(result.current[0]).toBe(false);
	});

	it('toggling to dark adds "dark" class to documentElement', () => {
		const { result } = renderHook(() => useTheme());
		act(() => result.current[1](true));
		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	it('toggling to light removes "dark" class from documentElement', () => {
		localStorage.setItem("theme", "dark");
		const { result } = renderHook(() => useTheme());
		act(() => result.current[1](false));
		expect(document.documentElement.classList.contains("dark")).toBe(false);
	});

	it("persists dark preference to localStorage", () => {
		const { result } = renderHook(() => useTheme());
		act(() => result.current[1](true));
		expect(localStorage.getItem("theme")).toBe("dark");
	});

	it("persists light preference to localStorage", () => {
		localStorage.setItem("theme", "dark");
		const { result } = renderHook(() => useTheme());
		act(() => result.current[1](false));
		expect(localStorage.getItem("theme")).toBe("light");
	});

	it('"system" follows the OS dark-mode setting', () => {
		window.matchMedia = vi.fn().mockReturnValue({
			matches: true,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		});
		localStorage.setItem("theme", "system");
		const { result } = renderHook(() => useTheme());
		expect(result.current[0]).toBe(true);
		expect(result.current[2]).toBe("system");
		expect(document.documentElement.classList.contains("dark")).toBe(true);
		delete window.matchMedia;
	});

	it("setMode saves the mode", () => {
		const { result } = renderHook(() => useTheme());
		act(() => result.current[3]("system"));
		expect(localStorage.getItem("theme")).toBe("system");
		expect(result.current[2]).toBe("system");
	});

	it("keeps every caller in sync when one changes the mode", () => {
		const a = renderHook(() => useTheme());
		const b = renderHook(() => useTheme());
		act(() => a.result.current[1](true));
		expect(b.result.current[0]).toBe(true);
		expect(b.result.current[2]).toBe("dark");
	});
});
