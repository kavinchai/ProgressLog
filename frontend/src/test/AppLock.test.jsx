import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const lock = vi.hoisted(() => ({ on: true }));
vi.mock("../native/biometricLock", () => ({
	isLockOn: () => lock.on,
	unlockWithBiometrics: vi.fn(),
	biometryType: vi.fn(() => Promise.resolve("faceID")),
	syncPrivacyCover: vi.fn(),
}));
vi.mock("../components/AppLock.css", () => ({}));

import AppLock from "../components/AppLock";
import {
	syncPrivacyCover,
	unlockWithBiometrics,
} from "../native/biometricLock";

let now = 1_000_000;

function setVisibility(state) {
	Object.defineProperty(document, "visibilityState", {
		value: state,
		configurable: true,
	});
	act(() => {
		document.dispatchEvent(new Event("visibilitychange"));
	});
}

function renderApp() {
	return render(
		<AppLock>
			<p>Today</p>
		</AppLock>,
	);
}

const lockScreen = () =>
	screen.queryByRole("dialog", { name: /progress logger is locked/i });

beforeEach(() => {
	vi.clearAllMocks();
	lock.on = true;
	now = 1_000_000;
	vi.spyOn(Date, "now").mockImplementation(() => now);
});

afterEach(() => {
	vi.restoreAllMocks();
	delete document.visibilityState;
});

describe("AppLock", () => {
	it("doesn't lock when Face ID unlock is off", () => {
		lock.on = false;
		renderApp();
		expect(lockScreen()).toBeNull();
		expect(screen.getByText("Today")).toBeInTheDocument();
		expect(unlockWithBiometrics).not.toHaveBeenCalled();
	});

	it("locks on launch and asks for Face ID straight away", async () => {
		unlockWithBiometrics.mockResolvedValue(true);
		renderApp();
		expect(lockScreen()).toBeInTheDocument();
		expect(unlockWithBiometrics).toHaveBeenCalledTimes(1);
		await waitFor(() => expect(lockScreen()).toBeNull());
	});

	it("stays locked if Face ID fails, and the button tries again", async () => {
		unlockWithBiometrics.mockResolvedValueOnce(false);
		renderApp();
		const button = await screen.findByRole("button", {
			name: /unlock with face id/i,
		});
		await waitFor(() => expect(button).toBeEnabled());
		expect(lockScreen()).toBeInTheDocument();

		unlockWithBiometrics.mockResolvedValueOnce(true);
		await userEvent.click(button);
		await waitFor(() => expect(lockScreen()).toBeNull());
		expect(unlockWithBiometrics).toHaveBeenCalledTimes(2);
	});

	it("locks again after more than a minute away", async () => {
		unlockWithBiometrics.mockResolvedValue(true);
		renderApp();
		await waitFor(() => expect(lockScreen()).toBeNull());

		setVisibility("hidden");
		now += 61_000;
		setVisibility("visible");

		expect(lockScreen()).toBeInTheDocument();
		await waitFor(() => expect(lockScreen()).toBeNull());
		expect(unlockWithBiometrics).toHaveBeenCalledTimes(2);
	});

	it("doesn't lock after a quick trip away", async () => {
		unlockWithBiometrics.mockResolvedValue(true);
		renderApp();
		await waitFor(() => expect(lockScreen()).toBeNull());

		setVisibility("hidden");
		now += 20_000;
		setVisibility("visible");

		expect(lockScreen()).toBeNull();
		expect(unlockWithBiometrics).toHaveBeenCalledTimes(1);
	});

	it("keeps the page underneath so nothing is lost while locked", async () => {
		unlockWithBiometrics.mockResolvedValue(false);
		renderApp();
		expect(screen.getByText("Today")).toBeInTheDocument();
		await screen.findByRole("button", { name: /unlock with face id/i });
	});

	it("tells the app to cover the app switcher when the lock is on", async () => {
		unlockWithBiometrics.mockResolvedValue(true);
		renderApp();
		expect(syncPrivacyCover).toHaveBeenCalled();
		await waitFor(() => expect(lockScreen()).toBeNull());
	});
});
