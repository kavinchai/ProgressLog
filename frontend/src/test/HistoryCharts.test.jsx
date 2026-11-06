import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { WorkoutGrid } from "../components/HistoryCharts";

describe("WorkoutGrid", () => {
	it("renders the days as a native list, one item per day", () => {
		render(
			<WorkoutGrid
				title="Workout consistency"
				days={[
					{ date: "2026-05-03", count: 0 },
					{ date: "2026-05-04", count: 1 },
					{ date: "2026-05-05", count: 2 },
				]}
			/>,
		);
		const list = screen.getByRole("list", { name: "Workout days" });
		expect(list.tagName).toBe("UL");
		const items = within(list).getAllByRole("listitem");
		expect(items.map((li) => li.tagName)).toEqual(["LI", "LI", "LI"]);
		expect(items[1]).toHaveAccessibleName("2026-05-04: 1 workout");
		expect(screen.getByText("2 workout days")).toBeInTheDocument();
	});

	it("labels the axes so it reads as one column per week", () => {
		// Three Sun–Sat weeks: Apr 26, May 3, May 10.
		const days = [];
		for (let d = new Date(2026, 3, 26); d <= new Date(2026, 4, 16); ) {
			const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
			days.push({ date: iso, count: 0 });
			d.setDate(d.getDate() + 1);
		}
		render(<WorkoutGrid title="Workout consistency" days={days} />);

		const weekdays = screen.getByTestId("grid-weekdays");
		expect(
			within(weekdays)
				.getAllByText(/\w/)
				.map((el) => el.textContent),
		).toEqual(["Mon", "Wed", "Fri"]);

		// One slot per week column; a month name only where a new month starts.
		const months = screen.getByTestId("grid-months");
		expect([...months.children].map((el) => el.textContent)).toEqual([
			"Apr",
			"May",
			"",
		]);

		expect(
			screen.getByText("Each column is one week (Sun–Sat)"),
		).toBeInTheDocument();
	});
});
