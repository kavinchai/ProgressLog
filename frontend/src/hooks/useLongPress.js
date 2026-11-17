import { useRef } from "react";
import { tapLight } from "../native/haptics";

const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE = 8; // px of finger movement before it's a scroll, not a press

/** Touch handlers that call `onLongPress` (with a light tap) after a press-and-hold. */
export default function useLongPress(onLongPress) {
	const timer = useRef(null);
	const start = useRef(null);

	function cancel() {
		clearTimeout(timer.current);
		timer.current = null;
	}

	return {
		onTouchStart(e) {
			const t = e.touches[0];
			start.current = { x: t.clientX, y: t.clientY };
			cancel();
			timer.current = setTimeout(() => {
				timer.current = null;
				tapLight();
				onLongPress();
			}, LONG_PRESS_MS);
		},
		onTouchMove(e) {
			const t = e.touches[0];
			const s = start.current;
			if (
				s &&
				(Math.abs(t.clientX - s.x) > MOVE_TOLERANCE ||
					Math.abs(t.clientY - s.y) > MOVE_TOLERANCE)
			) {
				cancel();
			}
		},
		onTouchEnd: cancel,
		onTouchCancel: cancel,
		// Stop iOS showing its own copy/lookup menu on a long press.
		onContextMenu: (e) => e.preventDefault(),
	};
}
