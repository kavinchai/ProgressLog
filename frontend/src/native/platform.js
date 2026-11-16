import { Capacitor } from "@capacitor/core";

/** True inside the iPhone app, false on the website. */
export function isIOSApp() {
	return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}
