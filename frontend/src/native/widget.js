// Feeds the iOS home-screen widget (ios/App/ProgressWidget). The app saves
// today's totals to storage shared with the widget, through the app's own
// WidgetBridge plugin (ios/App/App/WidgetBridgePlugin.swift), and iOS redraws it.
import { Capacitor, registerPlugin } from "@capacitor/core";
import useAuthStore from "../store/authStore";

const WidgetBridge = registerPlugin("WidgetBridge");

let lastSent = null;

function isIOSApp() {
	return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

/** Sends today's totals to the widget, skipping repeats of what it already shows. */
export function updateWidget(totals) {
	if (!isIOSApp()) return;
	const key = JSON.stringify(totals);
	if (key === lastSent) return;
	lastSent = key;
	WidgetBridge.update(totals).catch(() => {
		lastSent = null;
	});
}

// Blank the widget on logout or a change of account so it never shows the
// previous person's day.
useAuthStore.subscribe((state, prev) => {
	if (!state.authenticated || state.username !== prev.username) {
		lastSent = null;
		if (isIOSApp()) WidgetBridge.clear().catch(() => {});
	}
});
