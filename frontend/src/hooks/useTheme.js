import { useState, useEffect } from "react";

// Theme mode: "light" | "dark" | "system" (follows the OS setting).
// Every useTheme caller (sidebar, phone top bar, Settings) stays in sync
// through a window event fired whenever the mode changes.
const THEME_EVENT = "themechange";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readMode() {
	const saved = localStorage.getItem("theme");
	return saved === "dark" || saved === "system" ? saved : "light";
}

const systemPrefersDark = () =>
	window.matchMedia?.(DARK_QUERY).matches ?? false;

export default function useTheme() {
	const [mode, setModeState] = useState(readMode);
	const [systemDark, setSystemDark] = useState(systemPrefersDark);
	const dark = mode === "dark" || (mode === "system" && systemDark);

	useEffect(() => {
		document.documentElement.classList.toggle("dark", dark);
	}, [dark]);

	useEffect(() => {
		const sync = () => setModeState(readMode());
		window.addEventListener(THEME_EVENT, sync);
		return () => window.removeEventListener(THEME_EVENT, sync);
	}, []);

	useEffect(() => {
		if (mode !== "system") return;
		const mql = window.matchMedia?.(DARK_QUERY);
		if (!mql) return;
		setSystemDark(mql.matches);
		const onChange = (e) => setSystemDark(e.matches);
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	}, [mode]);

	function setMode(next) {
		localStorage.setItem("theme", next);
		setModeState(next);
		window.dispatchEvent(new Event(THEME_EVENT));
	}

	// Light/dark toggle used by the sidebar and phone top bar.
	function setDark(value) {
		const next = typeof value === "function" ? value(dark) : value;
		setMode(next ? "dark" : "light");
	}

	return [dark, setDark, mode, setMode];
}
