// Taps from the iPhone's vibration motor (Taptic Engine) so saves and deletes
// feel like a native app. Does nothing on the website.
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isIOSApp } from "./platform";

function play(fn) {
	if (!isIOSApp()) return;
	fn().catch(() => {});
}

/** Something saved. */
export function tapSuccess() {
	play(() => Haptics.notification({ type: NotificationType.Success }));
}

/** Something deleted. */
export function tapDelete() {
	play(() => Haptics.impact({ style: ImpactStyle.Medium }));
}

/** A gesture reached its trigger point (e.g. pull to refresh). */
export function tapLight() {
	play(() => Haptics.impact({ style: ImpactStyle.Light }));
}
