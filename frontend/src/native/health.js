// Apple Health import for the iOS app. Reads daily steps and body weight
// through the app's own HealthImport plugin (ios/App/App/HealthImportPlugin.swift)
// and saves them through the normal steps and weight endpoints.
import { Capacitor, registerPlugin } from "@capacitor/core";
import api from "../api";
import { refreshEndpoint } from "../hooks/useFetch";
import useAuthStore from "../store/authStore";
import { planHealthWrites } from "../utils/health";

const HealthImport = registerPlugin("HealthImport");

const CONNECTED_KEY = "progresslog-health-connected";
const SYNCED_KEY = "progresslog-health-synced";
const FIRST_IMPORT_DAYS = 30;

function read(key) {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function write(key, value) {
	try {
		localStorage.setItem(key, value);
	} catch {
		// Storage unavailable (private mode); the import still works, it
		// just won't be remembered.
	}
}

// The connection belongs to whoever connected it: forget it on logout or a
// change of account, so the next person's auto-sync can't import this
// phone owner's Health data into their account.
useAuthStore.subscribe((state, prev) => {
	if (!state.authenticated || state.username !== prev.username) {
		try {
			localStorage.removeItem(CONNECTED_KEY);
			localStorage.removeItem(SYNCED_KEY);
		} catch {
			// Nothing stored to clear.
		}
	}
});

export function isHealthSupported() {
	return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export function isHealthConnected() {
	return read(CONNECTED_KEY) === "true";
}

export function lastHealthSync() {
	return read(SYNCED_KEY);
}

/** Imports the last `days` days of steps and weight. Returns what was written. */
export async function syncHealth(days) {
	const [steps, weights, existingSteps, existingWeights] = await Promise.all([
		HealthImport.dailySteps({ days }),
		HealthImport.dailyWeights({ days }),
		api.get("/steps"),
		api.get("/weight"),
	]);

	const plan = planHealthWrites({
		healthSteps: steps.days,
		healthWeights: weights.days,
		existingSteps: existingSteps.data,
		existingWeights: existingWeights.data,
	});

	for (const s of plan.steps) await api.post("/steps", s);
	for (const w of plan.weights) await api.post("/weight", w);

	refreshEndpoint("/steps");
	refreshEndpoint("/weight");
	write(SYNCED_KEY, new Date().toISOString());
	return { steps: plan.steps.length, weights: plan.weights.length };
}

/** Asks for read access, imports the last 30 days and remembers the choice. */
export async function connectHealth() {
	const { available } = await HealthImport.isAvailable();
	if (!available) {
		throw new Error("Apple Health is not available on this device.");
	}
	await HealthImport.requestAuthorization();
	const result = await syncHealth(FIRST_IMPORT_DAYS);
	write(CONNECTED_KEY, "true");
	return result;
}
