/**
 * Achievements: the screen under Progress, the lifetime weight screen, the
 * badge sheet, and the celebration sheet that shows once when something new
 * is earned.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Achievements from "../pages/Achievements";
import AchievementCelebration from "../components/achievements/AchievementCelebration";
import useWorkouts from "../hooks/useWorkouts";
import useNutrition from "../hooks/useNutrition";
import useSteps from "../hooks/useSteps";
import useAuthStore from "../store/authStore";

vi.mock("../hooks/useWorkouts", () => ({ default: vi.fn() }));
vi.mock("../hooks/useNutrition", () => ({ default: vi.fn() }));
vi.mock("../hooks/useSteps", () => ({ default: vi.fn() }));
vi.mock("../hooks/useUserProfile", () => ({
	default: () => ({ goals: { proteinTarget: 150 } }),
}));
vi.mock("../hooks/useWeightUnit", () => ({
	default: () => ({ unit: "lbs", toDisplay: (v) => v }),
}));

const set = (exerciseName, weightLbs, reps) => ({
	exerciseName,
	weightLbs,
	reps,
});
const TODAY = "2026-11-18";
// 315 × 5 × 3 = 4,725 lbs: grand piano and car, first workout, 1–3 plate deadlift.
const DEADLIFT_DAY = {
	id: 1,
	sessionDate: TODAY,
	sessionName: "Pull",
	exerciseSets: [
		set("Deadlift", 315, 5),
		set("Deadlift", 315, 5),
		set("Deadlift", 315, 5),
	],
};

function setup({ workouts = [DEADLIFT_DAY], loading = false } = {}) {
	useWorkouts.mockReturnValue({ data: workouts, loading });
	useNutrition.mockReturnValue({ data: [], loading });
	useSteps.mockReturnValue({ data: [], loading });
}

function renderAt(path) {
	return render(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route path="/progress/achievements/*" element={<Achievements />} />
			</Routes>
		</MemoryRouter>,
	);
}

beforeEach(() => {
	vi.useFakeTimers({
		toFake: ["Date"],
		now: new Date(2026, 10, 18, 12, 0, 0),
		shouldAdvanceTime: true,
	});
	useAuthStore.setState({ authenticated: true, username: "alice" });
	localStorage.removeItem("achievements.seen:alice");
});

afterEach(() => {
	vi.useRealTimers();
});

describe("Achievements screen", () => {
	it("shows the lifetime weight, what it passed and what's next", () => {
		setup();
		renderAt("/progress/achievements");
		const card = screen.getByRole("button", {
			name: "Lifetime weight lifted: 4,725 lbs",
		});
		expect(card).toHaveTextContent("More than a car");
		expect(card).toHaveTextContent("2 of 8 milestones");
		expect(card).toHaveTextContent("Next: elephant · 8,275 lbs to go");
		expect(card.querySelector("img")).toHaveAttribute(
			"src",
			"/achievements/car.svg",
		);
	});

	it("marks earned badges and shows progress on the rest", () => {
		setup();
		renderAt("/progress/achievements");
		const plates = screen.getByRole("region", { name: "Plate clubs" });
		expect(
			within(plates).getByRole("button", { name: "3-plate deadlift, earned" }),
		).toHaveTextContent("Nov 18");
		expect(
			within(plates).getByRole("button", {
				name: "4-plate deadlift, not earned yet",
			}),
		).toHaveTextContent("315 / 405 lbs");
		expect(
			screen.getByRole("button", { name: "First workout, earned" }),
		).toBeInTheDocument();
	});

	it("opens a badge in a sheet with its levels", async () => {
		setup();
		renderAt("/progress/achievements");
		await userEvent.click(
			screen.getByRole("button", { name: "4-plate deadlift, not earned yet" }),
		);
		const sheet = screen.getByRole("dialog");
		expect(within(sheet).getByText("315 / 405 lbs · 78%")).toBeInTheDocument();
		expect(within(sheet).getByText("Your best")).toBeInTheDocument();
		const levels = within(sheet).getByText("Levels").closest("section");
		expect(within(levels).getAllByText(/-plate deadlift$/)).toHaveLength(5);
	});

	it("lists every weight milestone with its drawing file", () => {
		setup();
		renderAt("/progress/achievements/weight");
		const list = screen.getByRole("region", { name: "Milestones" });
		const drawings = [...list.querySelectorAll("img")].map((img) =>
			img.getAttribute("src"),
		);
		expect(drawings).toEqual([
			"/achievements/piano.svg",
			"/achievements/car.svg",
			"/achievements/elephant.svg",
			"/achievements/t-rex.svg",
			"/achievements/school-bus.svg",
			"/achievements/boeing-737.svg",
			"/achievements/space-shuttle.svg",
			"/achievements/blue-whale.svg",
		]);
		expect(screen.getByText("Biggest workout").parentElement).toHaveTextContent(
			"4,725 lbs",
		);
	});
});

describe("AchievementCelebration", () => {
	it("stays quiet the first time and only remembers what's already earned", () => {
		setup();
		render(<AchievementCelebration />);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(
			JSON.parse(localStorage.getItem("achievements.seen:alice")),
		).toContain("deadlift-3");
	});

	it("shows today's weight and the new badges once something new is earned", () => {
		setup({ workouts: [] });
		const { rerender } = render(<AchievementCelebration />);
		setup();
		act(() => rerender(<AchievementCelebration />));
		const sheet = screen.getByRole("dialog", { name: "Nice work" });
		expect(sheet).toHaveTextContent("Today you lifted a total of4,725 lbs");
		expect(sheet).toHaveTextContent("About the weight of a car");
		expect(within(sheet).getByText("3-plate deadlift")).toBeInTheDocument();
		expect(within(sheet).getByText("Car lifted")).toBeInTheDocument();
	});

	it("doesn't show the same achievements twice", () => {
		setup({ workouts: [] });
		const { rerender, unmount } = render(<AchievementCelebration />);
		setup();
		act(() => rerender(<AchievementCelebration />));
		unmount();
		render(<AchievementCelebration />);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("waits for the data to load before comparing", () => {
		setup({ workouts: [], loading: true });
		render(<AchievementCelebration />);
		expect(localStorage.getItem("achievements.seen:alice")).toBeNull();
	});
});
