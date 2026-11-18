import { create } from "zustand";

// Offline when the phone has no connection or the server can't be reached.
// api/index.js updates it from every request.
const useNetworkStore = create(() => ({
	offline: typeof navigator !== "undefined" && navigator.onLine === false,
}));

if (typeof window !== "undefined") {
	window.addEventListener("offline", () =>
		useNetworkStore.setState({ offline: true }),
	);
	window.addEventListener("online", () =>
		useNetworkStore.setState({ offline: false }),
	);
}

export default useNetworkStore;
