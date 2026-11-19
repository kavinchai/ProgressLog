import { flushSync } from "react-dom";

/**
 * Runs `update` (a state change or navigate) as an iOS-style push or pop:
 * the new screen slides in over the old one, or the old one slides away.
 * Uses the browser's View Transitions; without them, or with Reduce Motion
 * on, the screen just changes. Styles live in components/ios/ios.css.
 */
export function navTransition(direction, update) {
	const reduce = window.matchMedia?.(
		"(prefers-reduced-motion: reduce)",
	).matches;
	if (!document.startViewTransition || reduce) {
		update();
		return;
	}
	const root = document.documentElement;
	root.dataset.nav = direction;
	const transition = document.startViewTransition(() => flushSync(update));
	transition.finished.finally(() => delete root.dataset.nav);
}
