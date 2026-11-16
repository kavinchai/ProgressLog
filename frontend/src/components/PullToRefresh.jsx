import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { isIOSApp } from "../native/platform";
import { tapLight } from "../native/haptics";
import "./PullToRefresh.css";

const TRIGGER = 60; // px of pull that starts a refresh
const MAX_PULL = 90;
const RESISTANCE = 0.5; // the spinner moves half as far as your finger
const SPINNER_HEIGHT = 44;

/**
 * Pull down at the top of a page to reload it, like a native iOS list.
 * Only in the iPhone app: phone browsers have their own pull to refresh.
 */
export default function PullToRefresh({ onRefresh, children }) {
	const [pull, setPull] = useState(0);
	const [refreshing, setRefreshing] = useState(false);
	const gesture = useRef(null); // { startY, pull } while a finger is down
	const onRefreshRef = useRef(onRefresh);
	onRefreshRef.current = onRefresh;

	useEffect(() => {
		if (!isIOSApp()) return;

		function onStart(e) {
			// Only from the very top, and never under an open pop-up.
			if (window.scrollY > 0 || document.body.style.overflow === "hidden") {
				return;
			}
			gesture.current = { startY: e.touches[0].clientY, pull: 0 };
		}

		function onMove(e) {
			const g = gesture.current;
			if (!g) return;
			const dy = e.touches[0].clientY - g.startY;
			const next = Math.min(Math.max(dy * RESISTANCE, 0), MAX_PULL);
			if (g.pull < TRIGGER && next >= TRIGGER) tapLight();
			g.pull = next;
			setPull(next);
		}

		async function onEnd() {
			const g = gesture.current;
			gesture.current = null;
			if (!g) return;
			setPull(0);
			if (g.pull < TRIGGER) return;
			setRefreshing(true);
			try {
				await onRefreshRef.current();
			} catch {
				// Each screen shows its own load errors.
			} finally {
				setRefreshing(false);
			}
		}

		window.addEventListener("touchstart", onStart, { passive: true });
		window.addEventListener("touchmove", onMove, { passive: true });
		window.addEventListener("touchend", onEnd);
		window.addEventListener("touchcancel", onEnd);
		return () => {
			window.removeEventListener("touchstart", onStart);
			window.removeEventListener("touchmove", onMove);
			window.removeEventListener("touchend", onEnd);
			window.removeEventListener("touchcancel", onEnd);
		};
	}, []);

	const height = refreshing ? SPINNER_HEIGHT : pull;

	return (
		<>
			{height > 0 && (
				<div
					className={"ptr" + (pull > 0 ? " ptr--pulling" : "")}
					style={{ height }}
					{...(refreshing && { role: "status", "aria-label": "Refreshing" })}
				>
					<RefreshCw
						size={20}
						aria-hidden="true"
						className={refreshing ? "ptr-icon ptr-icon--spin" : "ptr-icon"}
						style={
							refreshing
								? undefined
								: {
										opacity: Math.min(pull / TRIGGER, 1),
										transform: `rotate(${(pull / TRIGGER) * 270}deg)`,
									}
						}
					/>
				</div>
			)}
			{children}
		</>
	);
}
