import { describe, expect, it, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import OfflineBanner from "../components/OfflineBanner";
import useNetworkStore from "../store/networkStore";
import useAuthStore from "../store/authStore";
import { localDateStr, shortDate } from "../utils/date";

const SAVED_AT = "progresslog-cache:alice:savedAt";

beforeEach(() => {
	useAuthStore.setState({ authenticated: true, username: "alice" });
});

describe("OfflineBanner", () => {
	it("shows nothing while online", () => {
		render(<OfflineBanner />);
		expect(screen.queryByRole("status")).toBeNull();
	});

	it("appears when the app goes offline, with the time the data is from", () => {
		const at = new Date();
		at.setHours(14, 14, 0, 0);
		localStorage.setItem(SAVED_AT, String(at.getTime()));
		render(<OfflineBanner />);
		act(() => useNetworkStore.setState({ offline: true }));
		expect(screen.getByRole("status")).toHaveTextContent(
			/^Offline · showing data from 2:14\sPM$/,
		);
	});

	it("shows the day for data from an earlier day", () => {
		const at = new Date();
		at.setDate(at.getDate() - 3);
		localStorage.setItem(SAVED_AT, String(at.getTime()));
		useNetworkStore.setState({ offline: true });
		render(<OfflineBanner />);
		expect(screen.getByRole("status")).toHaveTextContent(
			`Offline · showing data from ${shortDate(localDateStr(at))}`,
		);
	});

	it("just says offline when nothing has been saved yet", () => {
		useNetworkStore.setState({ offline: true });
		render(<OfflineBanner />);
		expect(screen.getByRole("status")).toHaveTextContent("You're offline");
	});
});
