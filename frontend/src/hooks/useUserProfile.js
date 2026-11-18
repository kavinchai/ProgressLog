import { useState, useEffect, useCallback } from "react";
import api from "../api";
import useAuthStore from "../store/authStore";
import { loadSaved, save } from "../utils/offlineCache";

const DEFAULT_GOALS = {
	calorieTargetTraining: 2600,
	calorieTargetRest: 2000,
	proteinTarget: 180,
};

// Every screen using goals, so a save on one (Settings) updates the others
// (the widget sync in the app layout) without a reload.
const goalListeners = new Set();

export default function useUserProfile() {
	// The last goals loaded are kept on the phone for when it's offline.
	const [goals, setGoals] = useState(
		() => loadSaved(useAuthStore.getState().username, "goals") ?? DEFAULT_GOALS,
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		goalListeners.add(setGoals);
		return () => goalListeners.delete(setGoals);
	}, []);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);

		api
			.get("/profile/goals")
			.then((res) => {
				save(useAuthStore.getState().username, "goals", res.data);
				if (!cancelled) setGoals(res.data);
			})
			.catch(() => {
				/* keep defaults silently */
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, []);

	const saveGoals = useCallback(async (updated) => {
		setSaving(true);
		setError(null);
		try {
			const res = await api.put("/profile/goals", updated);
			save(useAuthStore.getState().username, "goals", res.data);
			goalListeners.forEach((set) => set(res.data));
		} catch (err) {
			setError(err.response?.data?.message ?? "Failed to save goals");
			throw err;
		} finally {
			setSaving(false);
		}
	}, []);

	return { goals, loading, saving, error, saveGoals };
}
