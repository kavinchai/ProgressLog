import useNetworkStore from "../store/networkStore";

const OFFLINE_SAVE = "You're offline. Connect to save this.";

export const isNetworkError = (ex) => ex?.code === "ERR_NETWORK";

/** What to show when a save fails: offline, the server's message, or the fallback. */
export function errorMessage(ex, fallback, offline = OFFLINE_SAVE) {
	if (isNetworkError(ex) || useNetworkStore.getState().offline) return offline;
	return ex?.response?.data?.message ?? fallback;
}
