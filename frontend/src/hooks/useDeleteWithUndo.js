import { useCallback } from "react";
import api from "../api";
import { errorMessage } from "../utils/errors";
import { useToast } from "../components/Toast";
import { tapDelete } from "../native/haptics";

const UNDO_MS = 5000;

// The server's undo restores the most recent delete, so only the latest
// delete keeps its Undo button. { toast, id } so it only ever dismisses a
// toast from the same toast system.
let lastUndo = null;

/**
 * Deletes straight away (no "Are you sure?") and shows an Undo bar for a few
 * seconds, using the server's 30-day undo.
 */
export default function useDeleteWithUndo() {
	const toast = useToast();

	return useCallback(
		async ({ remove, message, refresh }) => {
			try {
				await remove();
			} catch (err) {
				toast.error(
					errorMessage(
						err,
						"Couldn't delete. Try again.",
						"You're offline. Connect to delete this.",
					),
				);
				return false;
			}
			tapDelete();
			refresh();
			if (lastUndo?.toast === toast) toast.dismiss(lastUndo.id);
			const id = toast.show({
				variant: "undo",
				message,
				durationMs: UNDO_MS,
				action: {
					label: "Undo",
					onClick: async () => {
						lastUndo = null;
						try {
							await api.post("/undo");
							refresh();
						} catch {
							toast.error("Couldn't undo. Try again.");
						}
					},
				},
			});
			lastUndo = { toast, id };
			return true;
		},
		[toast],
	);
}
