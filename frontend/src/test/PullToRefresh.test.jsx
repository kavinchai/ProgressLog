import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const platform = vi.hoisted(() => ({ ios: true }));
vi.mock("../native/platform", () => ({ isIOSApp: () => platform.ios }));
vi.mock("../native/haptics", () => ({ tapLight: vi.fn() }));
vi.mock("../components/PullToRefresh.css", () => ({}));

import PullToRefresh from "../components/PullToRefresh";
import { tapLight } from "../native/haptics";

function pull(...ys) {
	fireEvent.touchStart(window, { touches: [{ clientY: 0 }] });
	for (const y of ys)
		fireEvent.touchMove(window, { touches: [{ clientY: y }] });
	fireEvent.touchEnd(window, { touches: [] });
}

function renderPage(onRefresh) {
	return render(
		<PullToRefresh onRefresh={onRefresh}>
			<p>Today</p>
		</PullToRefresh>,
	);
}

beforeEach(() => {
	vi.clearAllMocks();
	platform.ios = true;
	Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
});

afterEach(() => {
	document.body.style.overflow = "";
});

describe("PullToRefresh in the iOS app", () => {
	it("refreshes when you pull down far enough at the top of the page", async () => {
		let finish;
		const onRefresh = vi.fn(() => new Promise((r) => (finish = r)));
		renderPage(onRefresh);

		pull(60, 140, 200);

		expect(onRefresh).toHaveBeenCalledTimes(1);
		expect(
			screen.getByRole("status", { name: /refreshing/i }),
		).toBeInTheDocument();

		await act(async () => finish());
		expect(screen.queryByRole("status", { name: /refreshing/i })).toBeNull();
		expect(screen.getByText("Today")).toBeInTheDocument();
	});

	it("gives one light tap when the pull passes the refresh point", () => {
		renderPage(vi.fn(() => Promise.resolve()));
		pull(40, 150, 200, 240);
		expect(tapLight).toHaveBeenCalledTimes(1);
	});

	it("does nothing for a short pull", () => {
		const onRefresh = vi.fn(() => Promise.resolve());
		renderPage(onRefresh);
		pull(40);
		expect(onRefresh).not.toHaveBeenCalled();
		expect(tapLight).not.toHaveBeenCalled();
	});

	it("does nothing when the page is scrolled down", () => {
		Object.defineProperty(window, "scrollY", {
			value: 300,
			configurable: true,
		});
		const onRefresh = vi.fn(() => Promise.resolve());
		renderPage(onRefresh);
		pull(100, 200);
		expect(onRefresh).not.toHaveBeenCalled();
	});

	it("does nothing while a pop-up is open", () => {
		document.body.style.overflow = "hidden";
		const onRefresh = vi.fn(() => Promise.resolve());
		renderPage(onRefresh);
		pull(100, 200);
		expect(onRefresh).not.toHaveBeenCalled();
	});

	it("still clears the spinner if the refresh fails", async () => {
		const onRefresh = vi.fn(() => Promise.reject(new Error("offline")));
		renderPage(onRefresh);
		await act(async () => pull(100, 200));
		expect(screen.queryByRole("status", { name: /refreshing/i })).toBeNull();
	});
});

describe("PullToRefresh outside the iOS app", () => {
	it("does nothing in a browser", () => {
		platform.ios = false;
		const onRefresh = vi.fn(() => Promise.resolve());
		renderPage(onRefresh);
		pull(100, 200);
		expect(onRefresh).not.toHaveBeenCalled();
		expect(screen.getByText("Today")).toBeInTheDocument();
	});
});
