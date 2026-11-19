import { useRef } from "react";

const MIN_DISTANCE = 50;
const SPRING = "cubic-bezier(0.32, 0.72, 0, 1)";
const OUT_MS = 160;
const IN_MS = 320;

const reducedMotion = () =>
	window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/**
 * Horizontal swipe on touch screens. Returns handlers to spread on an element:
 * a left swipe calls `onLeft`, a right swipe calls `onRight`. Mostly-vertical
 * drags are ignored so the page still scrolls.
 *
 * The element follows the finger while dragging. A swipe slides it off to the
 * side, swaps the content, then slides the new content in from the other side.
 * When `canLeft` / `canRight` is false that way only stretches and springs back.
 */
export default function useSwipe({
	onLeft,
	onRight,
	canLeft = true,
	canRight = true,
}) {
	const start = useRef(null);

	function slide(el, x, ms, easing) {
		el.style.transition = ms ? `transform ${ms}ms ${easing}` : "none";
		el.style.transform = x ? `translateX(${x}px)` : "";
	}

	return {
		onTouchStart(e) {
			// Rows that swipe to delete keep their own gesture, and touches in
			// sheets or menus (portals, outside this element) don't count.
			if (
				!e.currentTarget.contains(e.target) ||
				e.target.closest?.(".swipe-row-main, [data-no-page-swipe]")
			) {
				start.current = null;
				return;
			}
			const t = e.touches[0];
			start.current = { x: t.clientX, y: t.clientY, axis: null };
		},
		onTouchMove(e) {
			const s = start.current;
			if (!s || reducedMotion()) return;
			const t = e.touches[0];
			const dx = t.clientX - s.x;
			const dy = t.clientY - s.y;
			if (!s.axis) {
				if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
				s.axis = Math.abs(dx) > Math.abs(dy) * 1.5 ? "x" : "y";
			}
			if (s.axis !== "x") return;
			const blocked = (dx < 0 && !canLeft) || (dx > 0 && !canRight);
			slide(e.currentTarget, blocked ? dx / 3 : dx, 0);
		},
		onTouchEnd(e) {
			const s = start.current;
			if (!s) return;
			start.current = null;
			const el = e.currentTarget;
			const t = e.changedTouches[0];
			const dx = t.clientX - s.x;
			const dy = t.clientY - s.y;
			const isSwipe =
				s.axis !== "y" &&
				Math.abs(dx) >= MIN_DISTANCE &&
				Math.abs(dx) >= Math.abs(dy) * 1.5;
			const go = dx < 0 ? onLeft : onRight;
			const allowed = dx < 0 ? canLeft : canRight;

			if (reducedMotion()) {
				if (isSwipe) go?.();
				return;
			}
			if (!isSwipe || !allowed) {
				slide(el, 0, IN_MS, SPRING);
				return;
			}
			const width = el.offsetWidth || window.innerWidth;
			const dir = dx < 0 ? -1 : 1;
			slide(el, dir * width, OUT_MS, "cubic-bezier(0.4, 0, 1, 1)");
			setTimeout(() => {
				go?.();
				slide(el, -dir * width, 0);
				requestAnimationFrame(() =>
					requestAnimationFrame(() => slide(el, 0, IN_MS, SPRING)),
				);
			}, OUT_MS);
		},
	};
}
