/**
 * Strength page — "choose your lifts" card grid + detail.
 *
 * The page is structured as:
 *   1. Header: sort, time range, and a "Choose lifts" button
 *   2. A card per chosen lift (kept in localStorage; defaults to the
 *      featured lifts the user has logged). Lifts not trained in the
 *      selected range stay on the page, dimmed.
 *   3. Detail for the selected card: stat row, chart, session history table
 *   4. "Choose lifts" dialog: every logged lift with a checkbox, search,
 *      filter chips, and lifts trained in the range listed first.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Strength from "../pages/Strength";

vi.mock("../pages/Strength.css", () => ({}));

vi.mock("recharts", () => ({
	LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
	Line: () => null,
	XAxis: () => null,
	YAxis: () => null,
	CartesianGrid: () => null,
	Tooltip: () => null,
	ResponsiveContainer: ({ children }) => <div>{children}</div>,
}));

vi.mock("../config/featuredExercises.json", () => ({
	default: { strength: ["Bench Press", "Squat", "Deadlift"] },
}));

const mockApiGet = vi.fn();
vi.mock("../api", () => ({
	default: { get: (...args) => mockApiGet(...args) },
}));

vi.mock("../hooks/useWeightUnit", () => ({
	default: () => ({ unit: "lbs", toDisplay: (v) => v, toggleUnit: vi.fn() }),
}));

const STORAGE_KEY = "strength.chosenLifts";

const s = (sessionDate, maxWeightLbs, setCount = 3, repScheme = "5/5/5") => ({
	sessionDate,
	maxWeightLbs,
	setCount,
	repScheme,
});

// Fake today: 2026-04-15. 3M cutoff = 2026-01-15, 4W cutoff = 2026-03-18.
const STRENGTH_DATA = [
	{
		exerciseName: "Bench Press",
		data: [
			s("2026-04-01", 135, 3, "8/8/8"),
			s("2026-04-08", 145, 3, "6/6/6"),
			s("2026-04-15", 155, 3, "5/5/5"),
		],
	},
	{
		exerciseName: "Squat",
		data: [s("2026-04-05", 185, 5), s("2026-04-12", 195, 5)],
	},
	{ exerciseName: "Deadlift", data: [s("2025-09-01", 225)] },
	{ exerciseName: "Bicep Curl", data: [s("2026-04-10", 30)] },
	{ exerciseName: "Old Row", data: [s("2025-06-01", 100)] },
];

const cardNames = () =>
	within(screen.getByTestId("lift-grid"))
		.getAllByRole("button")
		.map((b) => b.getAttribute("aria-label"));

async function renderLoaded(data = STRENGTH_DATA) {
	mockApiGet.mockResolvedValue({ data });
	render(<Strength />);
	await screen.findByTestId("lift-grid");
}

async function openChooser() {
	await userEvent.click(screen.getByRole("button", { name: /choose lifts/i }));
	return screen.getByRole("dialog");
}

beforeEach(() => {
	vi.useFakeTimers({
		toFake: ["Date"],
		now: new Date(2026, 3, 15, 12, 0, 0),
	});
	vi.clearAllMocks();
	localStorage.clear();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("Strength page — states", () => {
	it("shows loading state initially", () => {
		mockApiGet.mockReturnValue(new Promise(() => {}));
		render(<Strength />);
		expect(screen.getByText(/loading/i)).toBeInTheDocument();
	});

	it("shows error state on API failure", async () => {
		mockApiGet.mockRejectedValue(new Error("Network error"));
		render(<Strength />);
		await waitFor(() => {
			expect(screen.getByText(/error/i)).toBeInTheDocument();
		});
	});

	it("shows empty state when no exercises tracked", async () => {
		mockApiGet.mockResolvedValue({ data: [] });
		render(<Strength />);
		await waitFor(() => {
			expect(screen.getByText(/no strength data/i)).toBeInTheDocument();
		});
	});

	it("has no Cardio content", async () => {
		await renderLoaded();
		expect(screen.queryByText(/cardio/i)).not.toBeInTheDocument();
	});
});

describe("Strength page — chosen lift cards", () => {
	it("defaults to the featured lifts the user has logged", async () => {
		await renderLoaded();
		expect(cardNames()).toEqual(["Bench Press", "Squat", "Deadlift"]);
		expect(screen.getByText(/3 lifts/i)).toBeInTheDocument();
	});

	it("falls back to the most recently trained lifts when no featured lift is logged", async () => {
		await renderLoaded([
			{ exerciseName: "Old Row", data: [s("2025-06-01", 100)] },
			{ exerciseName: "Bicep Curl", data: [s("2026-04-10", 30)] },
		]);
		expect(cardNames()).toEqual(["Bicep Curl", "Old Row"]);
	});

	it("uses the lifts saved in localStorage, ignoring ones no longer logged", async () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify(["Old Row", "Bicep Curl", "Gone Lift"]),
		);
		await renderLoaded();
		expect(cardNames()).toEqual(["Bicep Curl", "Old Row"]);
	});

	it("shows current max and change in the range on each card", async () => {
		await renderLoaded();
		const bench = screen.getByRole("button", { name: "Bench Press" });
		expect(bench).toHaveTextContent("155 lbs");
		expect(bench).toHaveTextContent("+20 lbs");
	});

	it("dims a chosen lift that was not trained in the selected range", async () => {
		await renderLoaded();
		const deadlift = screen.getByRole("button", { name: "Deadlift" });
		expect(deadlift).toHaveClass("lift-card-stale");
		expect(deadlift).toHaveTextContent(/not trained in 3M/i);
	});

	it("selects the first card by default", async () => {
		await renderLoaded();
		expect(screen.getByRole("button", { name: "Bench Press" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(screen.getByRole("button", { name: "Squat" })).toHaveAttribute(
			"aria-pressed",
			"false",
		);
	});
});

describe("Strength page — sort", () => {
	it("sorts by most recent by default", async () => {
		await renderLoaded();
		const sort = screen.getByRole("group", { name: /sort lifts/i });
		expect(
			within(sort).getByRole("button", { name: "Recent" }),
		).toHaveAttribute("aria-pressed", "true");
		expect(cardNames()).toEqual(["Bench Press", "Squat", "Deadlift"]);
	});

	it("sorts by biggest change, untrained lifts last", async () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify(["Deadlift", "Squat", "Bench Press"]),
		);
		await renderLoaded();
		const sort = screen.getByRole("group", { name: /sort lifts/i });
		await userEvent.click(within(sort).getByRole("button", { name: "Change" }));
		expect(cardNames()).toEqual(["Bench Press", "Squat", "Deadlift"]);
	});

	it("sorts A–Z", async () => {
		await renderLoaded();
		const sort = screen.getByRole("group", { name: /sort lifts/i });
		await userEvent.click(within(sort).getByRole("button", { name: "A–Z" }));
		expect(cardNames()).toEqual(["Bench Press", "Deadlift", "Squat"]);
	});
});

describe("Strength page — detail for the selected lift", () => {
	it("shows current max, sessions, improvement and last trained", async () => {
		await renderLoaded();
		expect(
			within(screen.getByTestId("stat-current-max")).getByText(/155/),
		).toBeInTheDocument();
		expect(
			within(screen.getByTestId("stat-sessions")).getByText("3"),
		).toBeInTheDocument();
		expect(
			within(screen.getByTestId("stat-improvement")).getByText(/\+20/),
		).toBeInTheDocument();
		expect(
			within(screen.getByTestId("stat-last-trained")).getByText(/Today/i),
		).toBeInTheDocument();
	});

	it("updates the detail when another card is clicked", async () => {
		await renderLoaded();
		const squat = screen.getByRole("button", { name: "Squat" });
		await userEvent.click(squat);
		expect(squat).toHaveAttribute("aria-pressed", "true");
		expect(
			within(screen.getByTestId("stat-current-max")).getByText(/195/),
		).toBeInTheDocument();
		expect(
			within(screen.getByTestId("stat-sessions")).getByText("2"),
		).toBeInTheDocument();
		expect(
			within(screen.getByTestId("stat-last-trained")).getByText(/3 days ago/i),
		).toBeInTheDocument();
	});

	it("renders the chart", async () => {
		await renderLoaded();
		expect(screen.getByTestId("line-chart")).toBeInTheDocument();
	});

	it("lists sessions newest first and highlights the PR row", async () => {
		await renderLoaded();
		const table = screen.getByTestId("session-history-table");
		const rows = within(table).getAllByRole("row").slice(1);
		expect(rows).toHaveLength(3);
		expect(rows[0]).toHaveTextContent("2026-04-15");
		expect(rows[2]).toHaveTextContent("2026-04-01");
		expect(rows[0]).toHaveClass("strength-pr-row");
		expect(rows[2]).not.toHaveClass("strength-pr-row");
	});

	it("shows a no-sessions message for a lift not trained in the range", async () => {
		await renderLoaded();
		await userEvent.click(screen.getByRole("button", { name: "Deadlift" }));
		expect(
			screen.getByText(/no sessions in selected range/i),
		).toBeInTheDocument();
	});
});

// Fake today: 2026-04-15 → 4W 2026-03-18, 3M 2026-01-15, 6M 2025-10-17
const RANGED_DATA = [
	{
		exerciseName: "Bench Press",
		data: [
			s("2025-09-01", 100), // beyond 6M
			s("2026-01-01", 115), // within 6M
			s("2026-02-01", 125), // within 3M
			s("2026-04-01", 135), // within 4W
		],
	},
];

describe("Strength page — time range", () => {
	it("renders the four range buttons with 3M selected by default", async () => {
		await renderLoaded(RANGED_DATA);
		const range = screen.getByRole("group", { name: /time range/i });
		for (const label of ["4W", "6M", "All"]) {
			expect(
				within(range).getByRole("button", { name: label }),
			).toHaveAttribute("aria-pressed", "false");
		}
		expect(within(range).getByRole("button", { name: "3M" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});

	it("session stat reflects only sessions in the selected range", async () => {
		await renderLoaded(RANGED_DATA);
		const range = screen.getByRole("group", { name: /time range/i });
		const sessions = () =>
			within(screen.getByTestId("stat-sessions")).getByText(/\d+/).textContent;
		expect(sessions()).toBe("2");
		await userEvent.click(within(range).getByRole("button", { name: "4W" }));
		expect(sessions()).toBe("1");
		await userEvent.click(within(range).getByRole("button", { name: "6M" }));
		expect(sessions()).toBe("3");
		await userEvent.click(within(range).getByRole("button", { name: "All" }));
		expect(sessions()).toBe("4");
	});
});

describe("Strength page — Choose lifts dialog", () => {
	it("lists every logged lift with chosen ones checked", async () => {
		await renderLoaded();
		const dialog = await openChooser();
		expect(within(dialog).getAllByRole("checkbox")).toHaveLength(5);
		expect(
			within(dialog).getByRole("checkbox", { name: /Bench Press/ }),
		).toBeChecked();
		expect(
			within(dialog).getByRole("checkbox", { name: /Bicep Curl/ }),
		).not.toBeChecked();
	});

	it("groups lifts trained in the range ahead of older ones", async () => {
		await renderLoaded();
		const dialog = await openChooser();
		const recent = within(dialog).getByRole("group", {
			name: /trained in the last 3 months/i,
		});
		const older = within(dialog).getByRole("group", { name: /older/i });
		expect(within(recent).getAllByRole("checkbox")).toHaveLength(3);
		expect(
			within(older).getByRole("checkbox", { name: /Deadlift/ }),
		).toBeInTheDocument();
		expect(
			within(older).getByRole("checkbox", { name: /Old Row/ }),
		).toBeInTheDocument();
	});

	it("labels the range filter and rows, and drops the range filter for All", async () => {
		const user = userEvent.setup();
		await renderLoaded();
		let dialog = await openChooser();
		expect(
			within(dialog).getByRole("button", { name: "Trained in 3M · 3" }),
		).toBeInTheDocument();
		expect(
			within(dialog).getByRole("checkbox", { name: /Bench Press/ }),
		).toHaveAccessibleName(/(today|yesterday|days ago).*lbs/);
		await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

		await user.click(screen.getByRole("button", { name: "All" }));
		dialog = await openChooser();
		expect(
			within(dialog).queryByRole("button", { name: /Trained in/ }),
		).not.toBeInTheDocument();
		expect(
			within(dialog).getByRole("group", { name: "All lifts" }),
		).toBeInTheDocument();
	});

	it("filters the list by search text", async () => {
		await renderLoaded();
		const dialog = await openChooser();
		await userEvent.type(
			within(dialog).getByRole("searchbox", { name: /search exercises/i }),
			"row",
		);
		const boxes = within(dialog).getAllByRole("checkbox");
		expect(boxes).toHaveLength(1);
		expect(boxes[0]).toHaveAccessibleName(/Old Row/);
	});

	it("filters to the selected lifts", async () => {
		await renderLoaded();
		const dialog = await openChooser();
		await userEvent.click(
			within(dialog).getByRole("button", { name: /^Selected/ }),
		);
		expect(within(dialog).getAllByRole("checkbox")).toHaveLength(3);
	});

	it("adds a lift on Done and remembers it in localStorage", async () => {
		await renderLoaded();
		const dialog = await openChooser();
		await userEvent.click(
			within(dialog).getByRole("checkbox", { name: /Bicep Curl/ }),
		);
		await userEvent.click(within(dialog).getByRole("button", { name: "Done" }));
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(cardNames()).toContain("Bicep Curl");
		expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toContain(
			"Bicep Curl",
		);
	});

	it("discards changes on Cancel", async () => {
		await renderLoaded();
		const dialog = await openChooser();
		await userEvent.click(
			within(dialog).getByRole("checkbox", { name: /Squat/ }),
		);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Cancel" }),
		);
		expect(cardNames()).toContain("Squat");
		expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
	});

	it("resets to the featured lifts", async () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(["Old Row"]));
		await renderLoaded();
		const dialog = await openChooser();
		await userEvent.click(
			within(dialog).getByRole("button", { name: /reset to featured/i }),
		);
		await userEvent.click(within(dialog).getByRole("button", { name: "Done" }));
		expect(cardNames()).toEqual(["Bench Press", "Squat", "Deadlift"]);
	});

	it("keeps the selected card valid when it is removed", async () => {
		await renderLoaded();
		const dialog = await openChooser();
		await userEvent.click(
			within(dialog).getByRole("checkbox", { name: /Bench Press/ }),
		);
		await userEvent.click(within(dialog).getByRole("button", { name: "Done" }));
		expect(screen.getByRole("button", { name: "Squat" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});
});
