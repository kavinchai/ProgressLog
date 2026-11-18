// The last data each screen loaded, kept on the phone per user so the app
// can open with it when there's no connection. Deleted on logout.
const PREFIX = "progresslog-cache:";
const key = (user, name) => `${PREFIX}${user}:${name}`;

export function loadSaved(user, name) {
	if (!user) return undefined;
	try {
		const raw = localStorage.getItem(key(user, name));
		return raw == null ? undefined : JSON.parse(raw);
	} catch {
		return undefined;
	}
}

export function save(user, name, data) {
	if (!user) return;
	try {
		localStorage.setItem(key(user, name), JSON.stringify(data));
		localStorage.setItem(key(user, "savedAt"), String(Date.now()));
	} catch {
		/* storage full or blocked: the app still works online */
	}
}

/** When this user's data was last saved, as a timestamp, or null. */
export function savedAt(user) {
	const at = loadSaved(user, "savedAt");
	return typeof at === "number" ? at : null;
}

export function clearSavedData() {
	try {
		Object.keys(localStorage)
			.filter((k) => k.startsWith(PREFIX))
			.forEach((k) => localStorage.removeItem(k));
	} catch {
		/* nothing to clear */
	}
}
