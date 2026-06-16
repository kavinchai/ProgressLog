import { useState, useEffect } from "react";
import { localDateStr } from "../utils/date";

// Returns today's local date as 'YYYY-MM-DD', updating automatically at midnight
// and when the tab regains focus. Avoids stale dates from module-load constants.
export default function useToday() {
	const [today, setToday] = useState(() => localDateStr(new Date()));

	useEffect(() => {
		let timeoutId;

		function check() {
			const current = localDateStr(new Date());
			setToday((prev) => (prev === current ? prev : current));
		}

		function scheduleNextMidnight() {
			const now = new Date();
			const nextMidnight = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate() + 1,
				0,
				0,
				1,
				0,
			);
			timeoutId = setTimeout(() => {
				check();
				scheduleNextMidnight();
			}, nextMidnight - now);
		}

		function onVisible() {
			if (document.visibilityState === "visible") check();
		}

		scheduleNextMidnight();
		document.addEventListener("visibilitychange", onVisible);
		window.addEventListener("focus", check);

		return () => {
			clearTimeout(timeoutId);
			document.removeEventListener("visibilitychange", onVisible);
			window.removeEventListener("focus", check);
		};
	}, []);

	return today;
}
