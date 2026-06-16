import { useState } from "react";
import api from "../api";
import { useToast } from "../components/Toast";

export function useDayActions({
	date,
	nutritionEntry,
	workoutEntry,
	stepEntry,
	onRefetchN,
	onRefetchWo,
	onRefetchS,
}) {
	const toast = useToast();
	const [renamingSession, setRenamingSession] = useState(false);
	const [renameValue, setRenameValue] = useState("");
	const [renameSaving, setRenameSaving] = useState(false);

	async function submitRename() {
		if (!workoutEntry || renameSaving) return;
		setRenameSaving(true);
		try {
			await api.patch(`/workouts/${workoutEntry.id}/name`, {
				sessionName: renameValue.trim() || null,
			});
			onRefetchWo();
			setRenamingSession(false);
		} catch {
			toast.error("Failed to rename workout");
		} finally {
			setRenameSaving(false);
		}
	}

	async function saveSteps(steps) {
		try {
			if (steps != null) {
				await api.post("/steps", { logDate: date, steps: parseInt(steps) });
			} else if (stepEntry) {
				await api.delete(`/steps/${stepEntry.id}`);
			}
			onRefetchS();
		} catch {
			toast.error("Failed to save steps");
		}
	}

	// Creates the nutrition day log if it doesn't exist yet, returns the log id.
	async function getOrCreateNutritionLogId() {
		if (nutritionEntry?.id) return nutritionEntry.id;
		try {
			const res = await api.post("/nutrition", {
				logDate: date,
				dayType: "training",
			});
			onRefetchN();
			return res.data?.id;
		} catch {
			toast.error("Failed to create nutrition log");
			return null;
		}
	}

	return {
		renamingSession,
		setRenamingSession,
		renameValue,
		setRenameValue,
		renameSaving,
		submitRename,
		saveSteps,
		getOrCreateNutritionLogId,
	};
}
