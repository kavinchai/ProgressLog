import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import SharedCalendar from "../pages/SharedCalendar";
import useAuthStore from "../store/authStore";
import { getCurrentWeek, localDateStr } from "../utils/date";

vi.mock("../pages/SharedCalendar.css", () => ({}));
vi.mock("../components/Modal.css", () => ({}));

const mockApiGet = vi.fn();
vi.mock("../api", () => ({
	default: { get: (...args) => mockApiGet(...args) },
}));

function renderCalendar() {
	return render(
		<MemoryRouter>
			<SharedCalendar />
		</MemoryRouter>,
	);
}

const NOW = new Date();
const TODAY = localDateStr(NOW);
const WEEK = getCurrentWeek();
const MONTH = NOW.toLocaleDateString("en-US", { month: "long" });
const DAYS_IN_MONTH = new Date(
	NOW.getFullYear(),
	NOW.getMonth() + 1,
	0,
).getDate();
// Another day this month, so month-view tests don't depend on the week.
const OTHER_DAY = localDateStr(
	new Date(
		NOW.getFullYear(),
		NOW.getMonth(),
		NOW.getDate() === 1 ? 2 : NOW.getDate() - 1,
	),
);

/** The accessible name prefix of a day button, e.g. "October 29". */
function dayName(iso) {
	const [y, m, d] = iso.split("-").map(Number);
	return new Date(y, m - 1, d).toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
	});
}

function dayButton(iso) {
	return screen.getByRole("button", {
		name: new RegExp(`^${dayName(iso)}:`),
	});
}

const CALENDAR_DATA = {
	totalUsers: 2,
	entries: [
		{
			username: "alice",
			sessionDate: OTHER_DAY,
			sets: [
				{ exerciseName: "Bench Press", setNumber: 1, reps: 5, weightLbs: 185 },
				{ exerciseName: "Bench Press", setNumber: 2, reps: 5, weightLbs: 185 },
				{ exerciseName: "Bench Press", setNumber: 3, reps: 4, weightLbs: 185 },
				{ exerciseName: "Squats", setNumber: 1, reps: 5, weightLbs: 225 },
			],
		},
		{
			username: "bob",
			sessionDate: TODAY,
			sets: [
				{
					exerciseName: "Run",
					setNumber: 1,
					reps: 0,
					weightLbs: 0,
					distanceMiles: 3.2,
					durationSeconds: 1695,
				},
			],
		},
	],
};

beforeEach(() => {
	vi.clearAllMocks();
	useAuthStore.setState({ authenticated: false, username: null });
});

describe("SharedCalendar — states", () => {
	it("shows a loading state while fetching", () => {
		mockApiGet.mockReturnValue(new Promise(() => {}));
		renderCalendar();
		expect(screen.getByText(/loading shared calendar/i)).toBeInTheDocument();
	});

	it("calls GET /shared-calendar on mount", async () => {
		mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
		renderCalendar();
		await waitFor(() =>
			expect(mockApiGet).toHaveBeenCalledWith("/shared-calendar"),
		);
	});

	it("shows the opt-in empty state when no one has opted in", async () => {
		mockApiGet.mockResolvedValue({ data: { totalUsers: 0, entries: [] } });
		renderCalendar();
		expect(await screen.findByText(/no one has opted in/i)).toBeInTheDocument();
	});

	it("shows an error message when the fetch fails", async () => {
		mockApiGet.mockRejectedValue({
			response: { data: { message: "Server error" } },
		});
		renderCalendar();
		expect(await screen.findByText(/server error/i)).toBeInTheDocument();
	});
});

describe("SharedCalendar — month grid", () => {
	it("opens on this month, with a button for every day", async () => {
		mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
		renderCalendar();
		expect(
			await screen.findByText(`${MONTH} ${NOW.getFullYear()}`),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Month" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		const grid = screen.getByRole("group", { name: /days/i });
		expect(
			within(grid)
				.getAllByRole("button")
				.filter((b) => /:/.test(b.getAttribute("aria-label"))),
		).toHaveLength(DAYS_IN_MONTH);
	});

	it("renders weekday headers", async () => {
		mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
		renderCalendar();
		const grid = await screen.findByRole("group", { name: /days/i });
		for (const d of ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])
			expect(within(grid).getByText(d)).toBeInTheDocument();
	});

	it("each day says how many lifters trained, with their initials", async () => {
		mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
		renderCalendar();
		await screen.findByRole("group", { name: /days/i });
		const today = dayButton(TODAY);
		expect(today).toHaveAccessibleName(/1 lifter trained/);
		expect(within(today).getByText("B")).toBeInTheDocument();
		expect(within(today).getByText("1 trained")).toBeInTheDocument();
	});

	it("shows three avatars and +N when more lifters trained", async () => {
		mockApiGet.mockResolvedValue({
			data: {
				totalUsers: 5,
				entries: ["ann", "ben", "cat", "dan", "eve"].map((username) => ({
					username,
					sessionDate: TODAY,
					sets: [
						{ exerciseName: "Squats", setNumber: 1, reps: 5, weightLbs: 135 },
					],
				})),
			},
		});
		renderCalendar();
		await screen.findByRole("group", { name: /days/i });
		const today = dayButton(TODAY);
		expect(today).toHaveAccessibleName(/5 lifters trained/);
		expect(within(today).getByText("+2")).toBeInTheDocument();
		expect(within(today).queryByText("D")).not.toBeInTheDocument();
	});

	it("counts one lifter once when they logged several sessions that day", async () => {
		mockApiGet.mockResolvedValue({
			data: {
				totalUsers: 1,
				entries: [1, 2, 3].map(() => ({
					username: "qaf-test",
					sessionDate: TODAY,
					sets: [
						{
							exerciseName: "Overhead Press",
							setNumber: 1,
							reps: 5,
							weightLbs: 95,
						},
					],
				})),
			},
		});
		renderCalendar();
		await screen.findByRole("group", { name: /days/i });
		expect(dayButton(TODAY)).toHaveAccessibleName(/1 lifter trained/);
		const panel = screen.getByRole("region", { name: /day details/i });
		expect(within(panel).getAllByText("qaf-test")).toHaveLength(1);
		expect(within(panel).getAllByText(/overhead press/i)).toHaveLength(1);
	});
});

describe("SharedCalendar — day panel", () => {
	it("starts on today, listing who trained", async () => {
		mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
		renderCalendar();
		const panel = await screen.findByRole("region", { name: /day details/i });
		expect(dayButton(TODAY)).toHaveAttribute("aria-pressed", "true");
		expect(within(panel).getByText(/1 lifter trained/i)).toBeInTheDocument();
		expect(within(panel).getByText("bob")).toBeInTheDocument();
		expect(within(panel).getByText("Run")).toBeInTheDocument();
	});

	it("picking another day lists its lifters; a row opens in place to show the sets", async () => {
		const user = userEvent.setup();
		mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
		renderCalendar();
		await screen.findByRole("group", { name: /days/i });
		await user.click(dayButton(OTHER_DAY));

		const panel = screen.getByRole("region", { name: /day details/i });
		const row = within(panel).getByRole("button", { name: /alice/ });
		expect(row).toHaveAttribute("aria-expanded", "false");
		expect(
			within(panel).queryByText(/4 reps @ 185 lbs/),
		).not.toBeInTheDocument();

		await user.click(row);
		expect(row).toHaveAttribute("aria-expanded", "true");
		expect(within(panel).getAllByText(/5 reps @ 185 lbs/)).toHaveLength(2);
		expect(within(panel).getByText(/4 reps @ 185 lbs/)).toBeInTheDocument();
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("shows the session name instead of exercise names when there is one", async () => {
		mockApiGet.mockResolvedValue({
			data: {
				totalUsers: 1,
				entries: [
					{
						username: "carol",
						sessionDate: TODAY,
						sessionName: "Push Day",
						sets: [
							{
								exerciseName: "Bench Press",
								setNumber: 1,
								reps: 5,
								weightLbs: 135,
							},
						],
					},
				],
			},
		});
		renderCalendar();
		const panel = await screen.findByRole("region", { name: /day details/i });
		expect(within(panel).getByText("Push Day")).toBeInTheDocument();
		expect(within(panel).queryByText("Bench Press")).not.toBeInTheDocument();
	});

	it("says so when nobody trained that day", async () => {
		const user = userEvent.setup();
		mockApiGet.mockResolvedValue({
			data: { totalUsers: 1, entries: [CALENDAR_DATA.entries[0]] },
		});
		renderCalendar();
		await screen.findByRole("group", { name: /days/i });
		await user.click(dayButton(TODAY));
		expect(
			within(screen.getByRole("region", { name: /day details/i })).getByText(
				/no one trained/i,
			),
		).toBeInTheDocument();
	});
});

describe("SharedCalendar — navigation and views", () => {
	it("‹ goes to the previous month and Today comes back", async () => {
		const user = userEvent.setup();
		mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
		renderCalendar();
		await screen.findByRole("group", { name: /days/i });
		await user.click(screen.getByRole("button", { name: /previous/i }));
		const prev = new Date(NOW.getFullYear(), NOW.getMonth() - 1, 1);
		expect(
			screen.getByText(
				`${prev.toLocaleDateString("en-US", { month: "long" })} ${prev.getFullYear()}`,
			),
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Today" }));
		expect(
			screen.getByText(`${MONTH} ${NOW.getFullYear()}`),
		).toBeInTheDocument();
		expect(dayButton(TODAY)).toHaveAttribute("aria-pressed", "true");
	});

	it("Week shows the seven days of this week", async () => {
		const user = userEvent.setup();
		mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
		renderCalendar();
		await screen.findByRole("group", { name: /days/i });
		await user.click(screen.getByRole("button", { name: "Week" }));
		const grid = screen.getByRole("group", { name: /days/i });
		const days = within(grid)
			.getAllByRole("button")
			.filter((b) => /:/.test(b.getAttribute("aria-label")));
		expect(days).toHaveLength(7);
		expect(days[0]).toHaveAccessibleName(new RegExp(`^${dayName(WEEK[0])}:`));
		expect(days[6]).toHaveAccessibleName(new RegExp(`^${dayName(WEEK[6])}:`));
	});
});

describe("SharedCalendar — signed in", () => {
	it("marks the days you trained", async () => {
		useAuthStore.setState({ authenticated: true, username: "alice" });
		mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
		renderCalendar();
		await screen.findByRole("group", { name: /days/i });
		expect(dayButton(OTHER_DAY)).toHaveAccessibleName(/including you/);
		expect(dayButton(TODAY)).not.toHaveAccessibleName(/including you/);
	});

	it("Just me hides everyone else", async () => {
		const user = userEvent.setup();
		useAuthStore.setState({ authenticated: true, username: "alice" });
		mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
		renderCalendar();
		await screen.findByRole("group", { name: /days/i });
		await user.click(screen.getByRole("button", { name: "Just me" }));
		expect(dayButton(TODAY)).toHaveAccessibleName(/no workouts/);
		expect(dayButton(OTHER_DAY)).toHaveAccessibleName(/1 lifter trained/);
	});

	it("tags your own row in the day panel", async () => {
		useAuthStore.setState({ authenticated: true, username: "bob" });
		mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
		renderCalendar();
		const panel = await screen.findByRole("region", { name: /day details/i });
		expect(
			within(panel).getByRole("button", { name: /bob.*you/i }),
		).toBeInTheDocument();
	});

	it("signed out has no Just me filter", async () => {
		mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
		renderCalendar();
		await screen.findByRole("group", { name: /days/i });
		expect(
			screen.queryByRole("button", { name: "Just me" }),
		).not.toBeInTheDocument();
	});
});

describe("SharedCalendar — phone", () => {
	beforeEach(() => {
		window.matchMedia = vi.fn().mockImplementation((query) => ({
			matches: query === "(max-width: 640px)",
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}));
	});

	afterEach(() => {
		delete window.matchMedia;
	});

	it("opens the day's list in a bottom sheet when a day is tapped", async () => {
		const user = userEvent.setup();
		mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
		renderCalendar();
		await screen.findByRole("group", { name: /days/i });
		expect(
			screen.queryByRole("region", { name: /day details/i }),
		).not.toBeInTheDocument();

		await user.click(dayButton(TODAY));
		const sheet = screen.getByRole("dialog");
		expect(within(sheet).getByText("bob")).toBeInTheDocument();
		await user.click(within(sheet).getByRole("button", { name: /close/i }));
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});
});
