// Face ID unlock for the iPhone app, through the app's own BiometricLock
// plugin (ios/App/App/BiometricLockPlugin.swift). The setting lives on this
// phone only.
import { registerPlugin } from "@capacitor/core";
import { isIOSApp } from "./platform";

const BiometricLock = registerPlugin("BiometricLock");

const LOCK_KEY = "progresslog-face-id-lock";

/** "faceID", "touchID", or "none" (including on the website). */
export async function biometryType() {
	if (!isIOSApp()) return "none";
	try {
		return (await BiometricLock.biometryType()).type;
	} catch {
		return "none";
	}
}

/** Asks for Face ID (falling back to the passcode). True if it succeeded. */
export async function unlockWithBiometrics(reason) {
	if (!isIOSApp()) return false;
	try {
		return (await BiometricLock.unlock({ reason })).unlocked === true;
	} catch {
		return false;
	}
}

export function isLockOn() {
	if (!isIOSApp()) return false;
	try {
		return localStorage.getItem(LOCK_KEY) === "true";
	} catch {
		return false;
	}
}

export function setLockOn(on) {
	try {
		if (on) localStorage.setItem(LOCK_KEY, "true");
		else localStorage.removeItem(LOCK_KEY);
	} catch {
		// Storage unavailable: the lock just won't be remembered.
	}
	syncPrivacyCover();
}

/** While the lock is on, the app hides its screen in the app switcher. */
export function syncPrivacyCover() {
	if (!isIOSApp()) return;
	BiometricLock.setPrivacyCover({ enabled: isLockOn() }).catch(() => {});
}
