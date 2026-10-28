import { useState, useEffect, useCallback } from "react";
import api from "../api";
import useAuthStore from "../store/authStore";

// One cache shared by every useFetch caller, keyed by endpoint. A page shows
// cached data instantly and revalidates in the background (data can change
// outside the app, e.g. via the MCP server), so switching pages doesn't
// re-download everything before rendering. Cleared on logout / user change.
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

useAuthStore.subscribe((state, prev) => {
	if (!state.authenticated || state.username !== prev.username) {
		clearFetchCache();
	}
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
			notify(endpoint, { data: res.data, loading: false, error: null });
		})
		.catch((err) => {
			if (latestRequest.get(endpoint) !== id) return;
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

function initialState(endpoint) {
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
