import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MoreMenu from "../components/MoreMenu";

vi.mock("../components/MoreMenu.css", () => ({}));

function renderMenu(items) {
	return render(
		<div>
			<MoreMenu label="More actions for workout" items={items} />
			<p>outside</p>
		</div>,
	);
}

const trigger = () =>
	screen.getByRole("button", { name: "More actions for workout" });

describe("MoreMenu", () => {
	it("is closed until the ••• button is tapped", async () => {
		renderMenu([{ label: "Rename", onSelect: vi.fn() }]);
		expect(screen.queryByRole("menu")).toBeNull();
		expect(trigger()).toHaveAttribute("aria-expanded", "false");

		await userEvent.click(trigger());

		expect(screen.getByRole("menu")).toBeInTheDocument();
		expect(trigger()).toHaveAttribute("aria-expanded", "true");
	});

	it("runs the chosen action and closes", async () => {
		const rename = vi.fn();
		renderMenu([{ label: "Rename", onSelect: rename }]);
		await userEvent.click(trigger());
		await userEvent.click(screen.getByRole("menuitem", { name: "Rename" }));
		expect(rename).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole("menu")).toBeNull();
	});

	it("marks destructive actions and keeps them last", async () => {
		renderMenu([
			{ label: "Delete workout", onSelect: vi.fn(), destructive: true },
			{ label: "Rename", onSelect: vi.fn() },
		]);
		await userEvent.click(trigger());
		const items = screen.getAllByRole("menuitem");
		expect(items.map((i) => i.textContent)).toEqual([
			"Rename",
			"Delete workout",
		]);
		expect(items[1]).toHaveClass("more-menu-item--danger");
	});

	it("leaves out hidden actions", async () => {
		renderMenu([
			{ label: "Rename", onSelect: vi.fn() },
			{ label: "Edit workout", onSelect: vi.fn(), hidden: true },
		]);
		await userEvent.click(trigger());
		expect(screen.queryByRole("menuitem", { name: "Edit workout" })).toBeNull();
	});

	it("closes with Escape or a tap outside", async () => {
		renderMenu([{ label: "Rename", onSelect: vi.fn() }]);
		await userEvent.click(trigger());
		await userEvent.keyboard("{Escape}");
		expect(screen.queryByRole("menu")).toBeNull();

		await userEvent.click(trigger());
		await userEvent.click(screen.getByText("outside"));
		expect(screen.queryByRole("menu")).toBeNull();
	});
});
