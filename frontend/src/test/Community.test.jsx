import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Community from "../pages/Community";
import useAuthStore from "../store/authStore";
import { localDateStr } from "../utils/date";

vi.mock("../pages/Community.css", () => ({}));
vi.mock("../pages/SharedCalendar.css", () => ({}));
vi.mock("../pages/TotalStats.css", () => ({}));

vi.mock("recharts", () => ({
	ResponsiveContainer: ({ children }) => <div>{children}</div>,
	BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
	Bar: () => null,
	LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
	Line: () => null,
	XAxis: () => null,
	YAxis: () => null,
	CartesianGrid: () => null,
	Tooltip: () => null,
	Legend: () => null,
}));

const mockApiGet = vi.fn();
vi.mock("../api", () => ({
	default: { get: (...args) => mockApiGet(...args) },
}));

function renderCommunity() {
	return render(
		<MemoryRouter>
			<Community />
		</MemoryRouter>,
	);
}

function entry(rank, username, bestWeight, bestReps, change = null) {
	return {
		rank,
		username,
		bestWeight,
		bestReps,
		achievedDate: "2026-10-20",
		change,
	};
}

const BENCH_ENTRIES = Array.from({ length: 10 }, (_, i) =>
	entry(i + 1, `lifter${i + 1}`, 300 - i * 10, 5),
);

const DATA = {
	totalUsers: 23,
	totalSessions: 412,
	totalSets: 8930,
	prCount: 31,
	exercises: [
		{
			exerciseName: "Squats",
			totalSets: 90,
			participantCount: 2,
			entries: [entry(1, "alice", 405, 2, 1), entry(2, "kavin", 275, 5, -1)],
		},
		{
			exerciseName: "Bench Press",
			totalSets: 60,
			participantCount: 18,
			entries: BENCH_ENTRIES,
		},
		{
			exerciseName: "Zercher Squats",
			totalSets: 4,
			participantCount: 1,
			entries: [entry(1, "bob", 135, 5)],
		},
	],
	mostActive: [
		{ rank: 1, username: "mira", sessionCount: 19, totalSets: 412 },
		{ rank: 2, username: "kavin", sessionCount: 17, totalSets: 388 },
	],
	activity: [
		{ date: "2026-10-28", sessionCount: 2, setCount: 20 },
		{ date: "2026-10-29", sessionCount: 1, setCount: 10 },
	],
	me: null,
};

const ME = {
	sharing: true,
	standings: [
		{
			exerciseName: "Bench Press",
			rank: 12,
			participantCount: 18,
			bestWeight: 185,
			bestReps: 5,
			achievedDate: "2026-10-27",
			change: 1,
			ahead: entry(11, "dana", 195, 5),
		},
		{
			exerciseName: "Squats",
			rank: 2,
			participantCount: 2,
			bestWeight: 275,
			bestReps: 5,
			change: -1,
			ahead: entry(1, "alice", 405, 2),
		},
	],
};

function signIn(username = "kavin") {
	useAuthStore.setState({ authenticated: true, username });
}

beforeEach(() => {
	vi.clearAllMocks();
	useAuthStore.setState({ authenticated: false, username: null });
	localStorage.clear();
});

// ── Loading / error / empty ──────────────────────────────────────────────────

describe("Community — loading / error / empty states", () => {
	it("shows loading text while fetching", () => {
		mockApiGet.mockReturnValue(new Promise(() => {}));
		renderCommunity();
		expect(screen.getByText(/loading leaderboard/i)).toBeInTheDocument();
	});

	it("shows the API error message", async () => {
		mockApiGet.mockRejectedValue({
			response: { data: { message: "Server error" } },
		});
		renderCommunity();
		expect(await screen.findByText(/server error/i)).toBeInTheDocument();
	});

	it("shows a generic error when the rejection has no message", async () => {
		mockApiGet.mockRejectedValue(new Error("network"));
		renderCommunity();
		expect(await screen.findByText(/could not load/i)).toBeInTheDocument();
	});

	it("shows the opt-in empty state when no one shares", async () => {
		mockApiGet.mockResolvedValue({ data: { ...DATA, totalUsers: 0 } });
		renderCommunity();
		expect(await screen.findByText(/no one has opted in/i)).toBeInTheDocument();
	});

	it("says nothing was logged this month when there are sharers but no boards", async () => {
		mockApiGet.mockResolvedValue({ data: { ...DATA, exercises: [] } });
		renderCommunity();
		expect(
			await screen.findByText(/no lifts logged this month/i),
		).toBeInTheDocument();
	});
});

// ── Fetching and period ──────────────────────────────────────────────────────

describe("Community — period", () => {
	it("loads this month's boards by default", async () => {
		mockApiGet.mockResolvedValue({ data: DATA });
		renderCommunity();
		await waitFor(() =>
			expect(mockApiGet).toHaveBeenCalledWith("/leaderboard", {
				params: { period: "month" },
			}),
		);
		expect(
			await screen.findByRole("button", { name: "Period: This month" }),
		).toBeInTheDocument();
	});

	it("switching to All time refetches with period=all", async () => {
		const user = userEvent.setup();
		mockApiGet.mockResolvedValue({ data: DATA });
		renderCommunity();
		await choosePeriod(user, "All time");
		await waitFor(() =>
			expect(mockApiGet).toHaveBeenCalledWith("/leaderboard", {
				params: { period: "all" },
			}),
		);
		expect(
			screen.getByRole("button", { name: "Period: All time" }),
		).toBeInTheDocument();
	});
});

// ── Board ────────────────────────────────────────────────────────────────────

describe("Community — lift board", () => {
	it("shows featured lifts as choices, in featured order, and opens on the first", async () => {
		mockApiGet.mockResolvedValue({ data: DATA });
		renderCommunity();
		await boardLoaded();
		expect(await liftChips()).toEqual(["Bench Press", "Squats"]);
		expect(screen.getByRole("button", { name: "Bench Press" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});

	it("lists the ranked lifters with their best set", async () => {
		mockApiGet.mockResolvedValue({ data: DATA });
		renderCommunity();
		const podium = await boardLoaded();
		expect(within(podium).getByText("lifter1")).toBeInTheDocument();
		expect(within(podium).getByText("300 lbs × 5")).toBeInTheDocument();
		const rest = screen.getByRole("list", { name: "Bench Press leaderboard" });
		// top three on the podium + seven below
		expect(within(podium).getAllByRole("listitem")).toHaveLength(3);
		expect(within(rest).getAllByRole("listitem")).toHaveLength(7);
	});

	it("choosing another lift shows its board with week movement", async () => {
		const user = userEvent.setup();
		mockApiGet.mockResolvedValue({ data: DATA });
		renderCommunity();
		await pickLift(user, "Squats");
		const podium = screen.getByRole("list", { name: "Top three" });
		expect(within(podium).getByText("405 lbs × 2")).toBeInTheDocument();
		expect(within(podium).getByLabelText("Up 1")).toBeInTheDocument();
		expect(within(podium).getByLabelText("Down 1")).toBeInTheDocument();
	});

	it("shows Most active by sessions", async () => {
		signIn();
		mockApiGet.mockResolvedValue({ data: { ...DATA, me: ME } });
		renderCommunity();
		expect(await screen.findByText("Most active")).toBeInTheDocument();
		expect(screen.getByText("19 sessions")).toBeInTheDocument();
	});
	it("drops a lift that has no board after switching period", async () => {
		const user = userEvent.setup();
		signIn();
		localStorage.setItem(
			"community.chosenLifts",
			JSON.stringify(["Bench Press", "Squats", "Overhead Press"]),
		);
		const allTime = {
			...DATA,
			me: ME,
			exercises: [
				...DATA.exercises,
				{
					exerciseName: "Overhead Press",
					totalSets: 3,
					participantCount: 1,
					entries: [entry(1, "kavin", 135, 5)],
				},
			],
		};
		mockApiGet.mockImplementation((url, { params }) =>
			Promise.resolve({
				data:
					params.period === "all"
						? {
								...allTime,
								me: {
									sharing: true,
									standings: [
										...ME.standings,
										{
											exerciseName: "Overhead Press",
											rank: 1,
											participantCount: 1,
											bestWeight: 135,
											bestReps: 5,
											change: null,
											ahead: null,
										},
									],
								},
							}
						: { ...DATA, me: ME },
			}),
		);
		renderCommunity();
		await choosePeriod(user, "All time");
		await user.click(
			await screen.findByRole("button", { name: /overhead press.*#1/i }),
		);
		expect(screen.getByText("You're #1")).toBeInTheDocument();
		await choosePeriod(user, "This month");
		await waitFor(async () =>
			expect(await liftChips()).not.toContain("Overhead Press"),
		);
		expect(screen.getByRole("button", { name: "Bench Press" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});
});

// ── Choose lifts ─────────────────────────────────────────────────────────────

const ME_WITH_ZERCHER = {
	sharing: true,
	standings: [
		...ME.standings,
		{
			exerciseName: "Zercher Squats",
			rank: 2,
			participantCount: 2,
			bestWeight: 115,
			bestReps: 5,
			change: null,
			ahead: entry(1, "bob", 135, 5),
		},
	],
};

// The board has loaded once its podium shows.
function boardLoaded() {
	return screen.findByRole("list", { name: "Top three" });
}

// Names of the lift chips (the Edit lifts button isn't one).
async function liftChips() {
	const group = await screen.findByRole("group", { name: "Lift" });
	return within(group)
		.getAllByRole("button")
		.filter((b) => b.hasAttribute("aria-pressed"))
		.map((b) => b.textContent);
}

async function pickLift(user, name) {
	const group = await screen.findByRole("group", { name: "Lift" });
	await user.click(within(group).getByRole("button", { name }));
}

async function choosePeriod(user, label) {
	await user.click(await screen.findByRole("button", { name: /^Period: / }));
	await user.click(
		within(screen.getByRole("menu", { name: "Period" })).getByRole(
			"menuitemradio",
			{ name: label },
		),
	);
}

describe("Community — choose lifts", () => {
	it("signed out shows only featured lifts and no chooser", async () => {
		mockApiGet.mockResolvedValue({ data: DATA });
		renderCommunity();
		await boardLoaded();
		expect(await liftChips()).toEqual(["Bench Press", "Squats"]);
		expect(
			screen.queryByRole("button", { name: "Edit lifts" }),
		).not.toBeInTheDocument();
	});

	it("signed out says so when no featured lift has a board", async () => {
		mockApiGet.mockResolvedValue({
			data: { ...DATA, exercises: [DATA.exercises[2]] },
		});
		renderCommunity();
		expect(
			await screen.findByText(/no featured lifts have been logged/i),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("list", { name: "Top three" }),
		).not.toBeInTheDocument();
	});

	it("signed in starts on the featured lifts, for the Lift menu and standing cards", async () => {
		signIn();
		mockApiGet.mockResolvedValue({ data: { ...DATA, me: ME_WITH_ZERCHER } });
		renderCommunity();
		await boardLoaded();
		expect(await liftChips()).toEqual(["Bench Press", "Squats"]);
		expect(
			screen.getByRole("button", { name: "Edit lifts" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /zercher squats.*#2/i }),
		).not.toBeInTheDocument();
	});

	it("adding a lift in Choose lifts adds it to the Lift menu and standing, and remembers it", async () => {
		const user = userEvent.setup();
		signIn();
		mockApiGet.mockResolvedValue({ data: { ...DATA, me: ME_WITH_ZERCHER } });
		renderCommunity();
		await user.click(await screen.findByRole("button", { name: "Edit lifts" }));
		const dialog = screen.getByRole("dialog", { name: "Choose lifts" });
		await user.click(within(dialog).getByLabelText(/zercher squats/i));
		await user.click(within(dialog).getByRole("button", { name: "Done" }));

		expect(await liftChips()).toEqual([
			"Bench Press",
			"Squats",
			"Zercher Squats",
		]);
		expect(
			screen.getByRole("button", { name: /zercher squats.*#2/i }),
		).toBeInTheDocument();
		expect(JSON.parse(localStorage.getItem("community.chosenLifts"))).toEqual([
			"Squats",
			"Bench Press",
			"Zercher Squats",
			// featured lifts with no board this period stay chosen
			"Bicep Curls",
			"Lateral Raises",
			"Lat Pulldowns",
			"Romanian Deadlifts",
			"Incline Bench Press",
		]);
	});

	it("uses the saved choice on the next visit", async () => {
		signIn();
		localStorage.setItem(
			"community.chosenLifts",
			JSON.stringify(["Zercher Squats"]),
		);
		mockApiGet.mockResolvedValue({ data: { ...DATA, me: ME_WITH_ZERCHER } });
		renderCommunity();
		await boardLoaded();
		expect(await liftChips()).toEqual(["Zercher Squats"]);
		expect(
			screen.queryByRole("button", { name: /bench press.*#12/i }),
		).not.toBeInTheDocument();
	});

	it("signed out ignores a choice saved on this browser", async () => {
		localStorage.setItem(
			"community.chosenLifts",
			JSON.stringify(["Zercher Squats"]),
		);
		mockApiGet.mockResolvedValue({ data: DATA });
		renderCommunity();
		await boardLoaded();
		expect(await liftChips()).toEqual(["Bench Press", "Squats"]);
	});

	it("unticking a lift removes it, Cancel changes nothing", async () => {
		const user = userEvent.setup();
		signIn();
		mockApiGet.mockResolvedValue({ data: { ...DATA, me: ME } });
		renderCommunity();
		await user.click(await screen.findByRole("button", { name: "Edit lifts" }));
		let dialog = screen.getByRole("dialog", { name: "Choose lifts" });
		await user.click(within(dialog).getByLabelText(/^squats/i));
		await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
		expect(await liftChips()).toEqual(["Bench Press", "Squats"]);
		expect(localStorage.getItem("community.chosenLifts")).toBeNull();

		await user.click(screen.getByRole("button", { name: "Edit lifts" }));
		dialog = screen.getByRole("dialog", { name: "Choose lifts" });
		expect(within(dialog).getByLabelText(/^squats/i)).toHaveAccessibleName(
			/2 lifters.*you #2/i,
		);
		await user.click(within(dialog).getByLabelText(/^squats/i));
		await user.click(within(dialog).getByRole("button", { name: "Done" }));
		expect(await liftChips()).toEqual(["Bench Press"]);
		expect(
			JSON.parse(localStorage.getItem("community.chosenLifts")),
		).not.toContain("Squats");
	});

	it("says when chosen lifts have no board this period", async () => {
		signIn();
		localStorage.setItem(
			"community.chosenLifts",
			JSON.stringify(["Overhead Press"]),
		);
		mockApiGet.mockResolvedValue({ data: { ...DATA, me: ME } });
		renderCommunity();
		expect(
			await screen.findByText(/none of your chosen lifts have been logged/i),
		).toBeInTheDocument();
		expect(
			screen.getByText(/not ranked on any of your chosen lifts/i),
		).toBeInTheDocument();
	});

	it("explains how to pick lifts when none are chosen", async () => {
		signIn();
		localStorage.setItem("community.chosenLifts", JSON.stringify([]));
		mockApiGet.mockResolvedValue({ data: { ...DATA, me: ME } });
		renderCommunity();
		expect(await screen.findByText(/no lifts chosen/i)).toBeInTheDocument();
		expect(
			screen.queryByRole("list", { name: "Top three" }),
		).not.toBeInTheDocument();
	});
});

// ── Signed out ───────────────────────────────────────────────────────────────

describe("Community — signed out", () => {
	it("has sign-in and sign-up links", async () => {
		mockApiGet.mockResolvedValue({ data: DATA });
		renderCommunity();
		await boardLoaded();
		for (const link of screen.getAllByRole("link", { name: /^sign in$/i }))
			expect(link).toHaveAttribute("href", "/login");
		const signups = screen.getAllByRole("link", {
			name: /create free account/i,
		});
		expect(signups.length).toBeGreaterThan(0);
		for (const link of signups)
			expect(link).toHaveAttribute("href", "/login?mode=signup");
	});

	it("pitches the app and invites the visitor to find their rank", async () => {
		mockApiGet.mockResolvedValue({ data: DATA });
		renderCommunity();
		expect(
			await screen.findByRole("heading", { name: /see where you rank/i }),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /find out/i })).toHaveAttribute(
			"href",
			"/login?mode=signup",
		);
		expect(screen.getByText(/how it works/i)).toBeInTheDocument();
	});

	it("shows community totals for the period", async () => {
		mockApiGet.mockResolvedValue({ data: DATA });
		renderCommunity();
		expect(await screen.findByText("Lifters sharing")).toBeInTheDocument();
		expect(screen.getByText("8,930")).toBeInTheDocument();
		expect(screen.getByText("PRs this month")).toBeInTheDocument();
		expect(screen.getByText("31")).toBeInTheDocument();
	});

	it("does not show a personal standing", async () => {
		mockApiGet.mockResolvedValue({ data: DATA });
		renderCommunity();
		await boardLoaded();
		expect(screen.queryByText("Your standing")).not.toBeInTheDocument();
	});
});

// ── Signed in ────────────────────────────────────────────────────────────────

describe("Community — signed in", () => {
	it("shows your standing on each lift with the gap to the next spot", async () => {
		signIn();
		mockApiGet.mockResolvedValue({ data: { ...DATA, me: ME } });
		renderCommunity();
		expect(await screen.findByText("Your standing")).toBeInTheDocument();
		const bench = screen.getByRole("button", { name: /bench press.*#12/i });
		expect(within(bench).getByText(/of 18/)).toBeInTheDocument();
		expect(
			within(bench).getByText("10 lbs to pass dana (#11)"),
		).toBeInTheDocument();
		const squats = screen.getByRole("button", { name: /squats.*#2/i });
		expect(
			within(squats).getByText("130 lbs to pass alice (#1)"),
		).toBeInTheDocument();
	});

	it("adds your own row under the top ten when you rank lower", async () => {
		signIn();
		mockApiGet.mockResolvedValue({ data: { ...DATA, me: ME } });
		renderCommunity();
		await boardLoaded();
		const rest = screen.getByRole("list", { name: "Bench Press leaderboard" });
		const mine = within(rest).getByText("kavin").closest("li");
		expect(mine).toHaveClass("lb-row-me");
		expect(within(mine).getByText("12")).toBeInTheDocument();
		expect(within(mine).getByText("185 lbs × 5")).toBeInTheDocument();
		expect(within(mine).getByText("Oct 27")).toBeInTheDocument();
	});

	it("highlights your row when you're in the top ten", async () => {
		const user = userEvent.setup();
		signIn();
		mockApiGet.mockResolvedValue({ data: { ...DATA, me: ME } });
		renderCommunity();
		await user.click(
			await screen.findByRole("button", { name: /squats.*#2/i }),
		);
		// Second place: you're on the podium.
		const podium = screen.getByRole("list", { name: "Top three" });
		expect(within(podium).getByText("kavin").closest("li")).toHaveClass(
			"lb-spot-me",
		);
		expect(screen.getByRole("button", { name: "Squats" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});

	it("asks you to turn on sharing when you're not on the boards", async () => {
		signIn();
		mockApiGet.mockResolvedValue({
			data: { ...DATA, me: { sharing: false, standings: [] } },
		});
		renderCommunity();
		expect(
			await screen.findByText(/turn on sharing to see where you rank/i),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /settings/i })).toHaveAttribute(
			"href",
			"/settings",
		);
	});

	it("counts reps when the lifter ahead has the same weight", async () => {
		signIn();
		mockApiGet.mockResolvedValue({
			data: {
				...DATA,
				me: {
					sharing: true,
					standings: [
						{
							exerciseName: "Bench Press",
							rank: 3,
							participantCount: 18,
							bestWeight: 185,
							bestReps: 6,
							change: null,
							ahead: entry(2, "mira", 185, 7),
						},
					],
				},
			},
		});
		renderCommunity();
		expect(
			await screen.findByText("2 reps to pass mira (#2)"),
		).toBeInTheDocument();
	});

	it("tells a sharing lifter with no lifts this period how to get ranked", async () => {
		signIn();
		mockApiGet.mockResolvedValue({
			data: { ...DATA, me: { sharing: true, standings: [] } },
		});
		renderCommunity();
		expect(
			await screen.findByText(/log a lift this period/i),
		).toBeInTheDocument();
	});

	it("has no sign-up pitch", async () => {
		signIn();
		mockApiGet.mockResolvedValue({ data: { ...DATA, me: ME } });
		renderCommunity();
		await boardLoaded();
		expect(
			screen.queryByRole("link", { name: /create free account/i }),
		).not.toBeInTheDocument();
	});
});

// ── Calendar view ────────────────────────────────────────────────────────────

describe("Community — header", () => {
	it("shows no sharing count under the title on either tab", async () => {
		const user = userEvent.setup();
		signIn();
		mockApiGet.mockImplementation((url) =>
			Promise.resolve({
				data:
					url === "/shared-calendar"
						? { totalUsers: 1, entries: [] }
						: { ...DATA, me: ME },
			}),
		);
		renderCommunity();
		await boardLoaded();
		expect(screen.queryByText(/lifters sharing/)).not.toBeInTheDocument();
		await user.click(
			within(screen.getByRole("group", { name: "View" })).getByRole("button", {
				name: "Calendar",
			}),
		);
		await screen.findByRole("group", { name: /days/i });
		expect(screen.queryByText(/lifters sharing/)).not.toBeInTheDocument();
	});
});

describe("Community — calendar view", () => {
	it("switching to Calendar fetches /shared-calendar and shows entries", async () => {
		const user = userEvent.setup();
		const today = localDateStr(new Date());
		mockApiGet.mockImplementation((url) => {
			if (url === "/shared-calendar") {
				return Promise.resolve({
					data: {
						totalUsers: 1,
						entries: [
							{
								username: "dana",
								sessionDate: today,
								sets: [
									{
										exerciseName: "Pull-ups",
										setNumber: 1,
										reps: 10,
										weightLbs: 0,
									},
								],
							},
						],
					},
				});
			}
			return Promise.resolve({ data: DATA });
		});

		renderCommunity();
		const view = await screen.findByRole("group", { name: "View" });
		await user.click(within(view).getByRole("button", { name: "Calendar" }));

		await waitFor(() => {
			expect(mockApiGet).toHaveBeenCalledWith("/shared-calendar");
			const day = screen.getByRole("region", { name: /day details/i });
			expect(within(day).getByText("dana")).toBeInTheDocument();
			expect(within(day).getByText(/pull-ups/i)).toBeInTheDocument();
		});
		expect(
			within(view).getByRole("button", { name: "Calendar" }),
		).toHaveAttribute("aria-pressed", "true");
	});
});

// ── Redesign: chips, podium, period menu, new bests, activity ───────────────

describe("Community — redesigned board", () => {
	it("lift chips pick the board", async () => {
		const user = userEvent.setup();
		signIn();
		mockApiGet.mockResolvedValue({ data: { ...DATA, me: ME } });
		renderCommunity();
		const chips = await screen.findByRole("group", { name: "Lift" });
		const names = within(chips)
			.getAllByRole("button", { pressed: false })
			.concat(within(chips).getAllByRole("button", { pressed: true }))
			.map((b) => b.textContent);
		expect(names).toEqual(expect.arrayContaining(["Bench Press", "Squats"]));
		expect(
			within(chips).getByRole("button", { name: "Bench Press" }),
		).toHaveAttribute("aria-pressed", "true");

		await user.click(within(chips).getByRole("button", { name: "Squats" }));
		expect(
			within(chips).getByRole("button", { name: "Squats" }),
		).toHaveAttribute("aria-pressed", "true");
		const podium = screen.getByRole("list", { name: "Top three" });
		expect(within(podium).getByText("alice")).toBeInTheDocument();
		expect(within(podium).getByText("405 lbs × 2")).toBeInTheDocument();
	});

	it("puts the top three on a podium and lists the rest below", async () => {
		mockApiGet.mockResolvedValue({ data: DATA });
		renderCommunity();
		const podium = await screen.findByRole("list", { name: "Top three" });
		expect(within(podium).getAllByRole("listitem")).toHaveLength(3);
		expect(within(podium).getByText("lifter1")).toBeInTheDocument();
		const rest = screen.getByRole("list", { name: "Bench Press leaderboard" });
		expect(within(rest).getAllByRole("listitem")).toHaveLength(7);
		expect(within(rest).getByText("lifter4")).toBeInTheDocument();
		expect(within(rest).queryByText("lifter1")).not.toBeInTheDocument();
	});

	it("the period menu switches to All time", async () => {
		const user = userEvent.setup();
		mockApiGet.mockResolvedValue({ data: DATA });
		renderCommunity();
		await user.click(
			await screen.findByRole("button", { name: "Period: This month" }),
		);
		await user.click(
			within(screen.getByRole("menu", { name: "Period" })).getByRole(
				"menuitemradio",
				{ name: "All time" },
			),
		);
		await waitFor(() =>
			expect(mockApiGet).toHaveBeenLastCalledWith("/leaderboard", {
				params: { period: "all" },
			}),
		);
		expect(
			screen.getByRole("button", { name: "Period: All time" }),
		).toBeInTheDocument();
	});

	it("lists the newest bests across lifts, yours as You", async () => {
		signIn();
		const dated = (e, achievedDate) => ({ ...e, achievedDate });
		mockApiGet.mockResolvedValue({
			data: {
				...DATA,
				me: ME,
				exercises: [
					{
						...DATA.exercises[0],
						entries: [
							dated(entry(1, "alice", 405, 2), "2026-10-05"),
							dated(entry(2, "kavin", 275, 5), "2026-10-25"),
						],
					},
					{
						...DATA.exercises[1],
						entries: [dated(entry(1, "dana", 300, 5), "2026-10-15")],
					},
				],
			},
		});
		renderCommunity();
		const feed = await screen.findByRole("region", { name: "New bests" });
		const items = within(feed).getAllByRole("listitem");
		expect(items[0]).toHaveTextContent("You hit 275 lbs × 5");
		expect(items[0]).toHaveTextContent("Squats · #2");
		expect(items[1]).toHaveTextContent("dana hit 300 lbs × 5");
		expect(items[2]).toHaveTextContent("alice hit 405 lbs × 2");
	});

	it("shows the community's sessions and how active you've been", async () => {
		signIn();
		mockApiGet.mockResolvedValue({ data: { ...DATA, me: ME } });
		renderCommunity();
		const active = await screen.findByRole("region", { name: "Most active" });
		expect(within(active).getByText("Community sessions")).toBeInTheDocument();
		expect(within(active).getByText("3")).toBeInTheDocument();
		expect(within(active).getByText("#2 most active")).toBeInTheDocument();
		expect(within(active).getByText("19 sessions")).toBeInTheDocument();
	});

	it("labels your standing bar with you and the lifter ahead", async () => {
		signIn();
		mockApiGet.mockResolvedValue({ data: { ...DATA, me: ME } });
		renderCommunity();
		const bench = await screen.findByRole("button", {
			name: /bench press.*#12/i,
		});
		expect(within(bench).getByText("You 185")).toBeInTheDocument();
		expect(within(bench).getByText("dana 195")).toBeInTheDocument();
		expect(within(bench).getByText("▲ 1 this week")).toBeInTheDocument();
	});
});
