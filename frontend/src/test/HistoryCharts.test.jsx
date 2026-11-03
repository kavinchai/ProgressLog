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
});
