import { describe, expect, it, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { render, screen, within } from "@testing-library/react";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import BottomTabBar from "../components/layout/BottomTabBar";
import useAuthStore from "../store/authStore";

vi.mock("../api", () => ({
	default: { post: vi.fn() },
}));

const setDark = vi.fn();
vi.mock("../hooks/useTheme", () => ({
	default: () => [false, setDark],
}));

beforeEach(() => {
	useAuthStore.setState({ authenticated: true, username: "alice" });
	setDark.mockClear();
});

describe("main navigation", () => {
	it("shows the cleaner top-level split in the desktop sidebar", () => {
		render(
			<BrowserRouter>
				<Sidebar />
			</BrowserRouter>,
		);

		const nav = screen.getByRole("navigation");
		expect(within(nav).getByRole("link", { name: "Today" })).toHaveAttribute(
			"href",
			"/today",
		);
		expect(within(nav).getByRole("link", { name: "History" })).toHaveAttribute(
			"href",
			"/history",
		);
		expect(within(nav).getByRole("link", { name: "Progress" })).toHaveAttribute(
			"href",
			"/progress",
		);
		expect(
			within(nav).getByRole("link", { name: "Community" }),
		).toHaveAttribute("href", "/community");
		expect(within(nav).getByRole("link", { name: "Settings" })).toHaveAttribute(
			"href",
			"/settings",
		);

		expect(
			within(nav).queryByRole("link", { name: "Weekly Stats" }),
		).not.toBeInTheDocument();
		expect(
			within(nav).queryByRole("link", { name: "Total Stats" }),
		).not.toBeInTheDocument();
		expect(
			within(nav).queryByRole("link", { name: "Strength" }),
		).not.toBeInTheDocument();
		expect(
			within(nav).queryByRole("link", { name: "Cardio" }),
		).not.toBeInTheDocument();
	});

	it("uses the same top-level split in the mobile bottom tab bar", () => {
		render(
			<BrowserRouter>
				<BottomTabBar />
			</BrowserRouter>,
		);

		const nav = screen.getByRole("navigation", { name: "Primary" });
		expect(within(nav).getByRole("link", { name: "Today" })).toHaveAttribute(
			"href",
			"/today",
		);
		expect(within(nav).getByRole("link", { name: "History" })).toHaveAttribute(
			"href",
			"/history",
		);
		expect(within(nav).getByRole("link", { name: "Progress" })).toHaveAttribute(
			"href",
			"/progress",
		);
		expect(
			within(nav).getByRole("link", { name: "Community" }),
		).toHaveAttribute("href", "/community");
		expect(within(nav).getByRole("link", { name: "Settings" })).toHaveAttribute(
			"href",
			"/settings",
		);

		// The bottom tab bar only surfaces the five primary destinations.
		expect(within(nav).getAllByRole("link")).toHaveLength(5);
		expect(
			within(nav).queryByRole("link", { name: "Strength" }),
		).not.toBeInTheDocument();
		expect(
			within(nav).queryByRole("link", { name: "Cardio" }),
		).not.toBeInTheDocument();
	});

	it("mobile top bar is just the brand (theme and log out live in Settings)", () => {
		render(
			<BrowserRouter>
				<Navbar />
			</BrowserRouter>,
		);

		expect(screen.getByText("ProgressLog")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Menu" }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /dark|light/i }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Log out" }),
		).not.toBeInTheDocument();
	});

	it("shows the anvil logo mark next to the brand in the sidebar and top bar", () => {
		const { container } = render(
			<BrowserRouter>
				<Sidebar />
				<Navbar />
			</BrowserRouter>,
		);

		for (const selector of [".sidebar-logo", ".navbar-brand"]) {
			const mark = container.querySelector(`${selector} img.brand-mark`);
			expect(mark).toHaveAttribute("src", "/favicon.svg");
			// Decorative: the brand name next to it is the accessible label.
			expect(mark).toHaveAttribute("alt", "");
		}
	});

	it("desktop sidebar has no theme toggle (Settings owns the theme)", () => {
		render(
			<BrowserRouter>
				<Sidebar />
			</BrowserRouter>,
		);

		expect(
			screen.queryByRole("button", { name: /dark mode|light mode/i }),
		).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
	});
});
