import { useEffect, useState } from "react";

// Matches the phone breakpoint used across the app's CSS.
export const MOBILE_QUERY = "(max-width: 640px)";

// True while `query` matches; follows viewport changes. False where the
// browser has no matchMedia (e.g. jsdom in tests).
export default function useMediaQuery(query) {
	const get = () => window.matchMedia?.(query).matches ?? false;
	const [matches, setMatches] = useState(get);

	useEffect(() => {
		const mql = window.matchMedia?.(query);
		if (!mql) return;
		setMatches(mql.matches);
		const onChange = (e) => setMatches(e.matches);
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	}, [query]);

	return matches;
}
