// Sign in with Apple for the iPhone app, through the app's own AppleSignIn
// plugin (ios/App/App/AppleSignInPlugin.swift). The backend checks the token.
import { registerPlugin } from "@capacitor/core";
import { isIOSApp } from "./platform";

const AppleSignIn = registerPlugin("AppleSignIn");

/** Only the iPhone app offers Sign in with Apple; the website doesn't. */
export function isAppleSignInAvailable() {
	return isIOSApp();
}

/**
 * Shows Apple's sheet. Resolves { identityToken, authorizationCode, givenName,
 * email }, or null if the person closed the sheet.
 */
export async function signInWithApple() {
	try {
		return await AppleSignIn.authorize();
	} catch (err) {
		if (err?.code === "canceled") return null;
		throw err;
	}
}
