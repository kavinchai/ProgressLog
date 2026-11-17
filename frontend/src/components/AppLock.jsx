import { useCallback, useEffect, useRef, useState } from "react";
import { ScanFace } from "lucide-react";
import {
	biometryType,
	isLockOn,
	syncPrivacyCover,
	unlockWithBiometrics,
} from "../native/biometricLock";
import "./AppLock.css";

const RELOCK_AFTER_MS = 60_000;

/**
 * Face ID unlock (iPhone app, turned on in Settings): covers the app when it
 * opens and when you come back after more than a minute away. The page stays
 * mounted underneath, so nothing you were doing is lost.
 */
export default function AppLock({ children }) {
	const [locked, setLocked] = useState(isLockOn);
	const [asking, setAsking] = useState(false);
	const [method, setMethod] = useState("Face ID");
	const hiddenAt = useRef(null);
	const askingRef = useRef(false);

	const unlock = useCallback(async () => {
		if (askingRef.current) return;
		askingRef.current = true;
		setAsking(true);
		const ok = await unlockWithBiometrics("Unlock Progress Logger");
		askingRef.current = false;
		setAsking(false);
		if (ok) setLocked(false);
	}, []);

	useEffect(() => {
		syncPrivacyCover();
		biometryType().then((type) => {
			if (type === "touchID") setMethod("Touch ID");
		});
		function onVisibility() {
			if (document.visibilityState === "hidden") {
				hiddenAt.current = Date.now();
			} else if (
				hiddenAt.current != null &&
				Date.now() - hiddenAt.current > RELOCK_AFTER_MS &&
				isLockOn()
			) {
				setLocked(true);
			}
		}
		document.addEventListener("visibilitychange", onVisibility);
		return () => document.removeEventListener("visibilitychange", onVisibility);
	}, []);

	// Ask straight away whenever the app locks.
	useEffect(() => {
		if (locked) unlock();
	}, [locked, unlock]);

	return (
		<>
			{children}
			{locked && (
				<div
					className="app-lock"
					role="dialog"
					aria-modal="true"
					aria-label="Progress Logger is locked"
				>
					<ScanFace size={48} aria-hidden="true" className="app-lock-icon" />
					<p className="app-lock-title">Progress Logger is locked</p>
					<button
						type="button"
						className="btn btn-primary"
						onClick={unlock}
						disabled={asking}
					>
						Unlock with {method}
					</button>
				</div>
			)}
		</>
	);
}
