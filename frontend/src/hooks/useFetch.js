import { useState, useEffect, useCallback } from "react";
import api from "../api";
import useAuthStore from "../store/authStore";
import useNetworkStore from "../store/networkStore";
import { isNetworkError } from "../utils/errors";
import { clearSavedData, loadSaved, save } from "../utils/offlineCache";

// One cache shared by every useFetch caller, keyed by endpoint. A page shows
// cached data instantly and revalidates in the background (data can change
// outside the app, e.g. via the MCP server), so switching pages doesn't
// re-download everything before rendering. Cleared on logout / user change.
// Each endpoint is also saved on the phone, so the app opens offline.
const cache = new Map(); // endpoint -> data
const inflight = new Map(); // endpoint -> promise
const latestRequest = new Map(); // endpoint -> request id (newest wins)
const listeners = new Map(); // endpoint -> Set<(patch) => void>
let requestId = 0;

export function clearFetchCache() {
	cache.clear();
	inflight.clear();
	latestRequest.clear();
}

const currentUser = () => useAuthStore.getState().username;

useAuthStore.subscribe((state, prev) => {
	if (!state.authenticated || state.username !== prev.username) {
		clearFetchCache();
	}
	if (!state.authenticated) clearSavedData();
});

// Back online: reload whatever is on screen.
useNetworkStore.subscribe((state, prev) => {
	if (prev.offline && !state.offline) refreshAll();
});

function notify(endpoint, patch) {
	listeners.get(endpoint)?.forEach((fn) => fn(patch));
}

function revalidate(endpoint, { force = false } = {}) {
	if (!force && inflight.has(endpoint)) return inflight.get(endpoint);
	const id = ++requestId;
	latestRequest.set(endpoint, id);
	const promise = api
		.get(endpoint)
		.then((res) => {
			if (latestRequest.get(endpoint) !== id) return;
			cache.set(endpoint, res.data);
			save(currentUser(), endpoint, res.data);
			notify(endpoint, { data: res.data, loading: false, error: null });
		})
		.catch((err) => {
			if (latestRequest.get(endpoint) !== id) return;
			// Offline with saved data: keep showing it (the banner says so).
			if (isNetworkError(err) && cache.has(endpoint)) {
				notify(endpoint, { loading: false, error: null });
				return;
			}
			notify(endpoint, {
				loading: false,
				error: err.message ?? "Failed to load data",
			});
		})
		.finally(() => {
			if (inflight.get(endpoint) === promise) inflight.delete(endpoint);
		});
	inflight.set(endpoint, promise);
	return promise;
}

/** Reloads an endpoint now and updates every screen showing it. */
export function refreshEndpoint(endpoint) {
	return revalidate(endpoint, { force: true });
}

/** Reloads every endpoint a screen is currently showing (pull to refresh). */
export function refreshAll() {
	const shown = [...listeners].filter(([, fns]) => fns.size > 0);
	return Promise.all(shown.map(([endpoint]) => refreshEndpoint(endpoint)));
}

function initialState(endpoint) {
	if (!cache.has(endpoint)) {
		const saved = loadSaved(currentUser(), endpoint);
		if (saved !== undefined) cache.set(endpoint, saved);
	}
	return cache.has(endpoint)
		? { data: cache.get(endpoint), loading: false, error: null }
		: { data: [], loading: true, error: null };
}

export default function useFetch(endpoint) {
	const [state, setState] = useState(() => initialState(endpoint));

	useEffect(() => {
		setState(initialState(endpoint));
		const listener = (patch) => setState((s) => ({ ...s, ...patch }));
		if (!listeners.has(endpoint)) listeners.set(endpoint, new Set());
		listeners.get(endpoint).add(listener);
		revalidate(endpoint);
		return () => {
			listeners.get(endpoint).delete(listener);
		};
	}, [endpoint]);

	const refetch = useCallback(
		() => revalidate(endpoint, { force: true }),
		[endpoint],
	);
	return { ...state, refetch };
}
