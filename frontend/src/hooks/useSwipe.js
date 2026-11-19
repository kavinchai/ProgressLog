import { useRef } from "react";

const MIN_DISTANCE = 50;

/**
 * Horizontal swipe on touch screens. Returns handlers to spread on an element:
 * a left swipe calls `onLeft`, a right swipe calls `onRight`. Mostly-vertical
 * drags are ignored so the page still scrolls.
 */
export default function useSwipe({ onLeft, onRight }) {
	const start = useRef(null);
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
			start.current = { x: t.clientX, y: t.clientY };
		},
		onTouchEnd(e) {
			if (!start.current) return;
			const t = e.changedTouches[0];
			const dx = t.clientX - start.current.x;
			const dy = t.clientY - start.current.y;
			start.current = null;
			if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) {
				return;
			}
			if (dx < 0) onLeft?.();
			else onRight?.();
		},
	};
}
