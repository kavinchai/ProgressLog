import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import Settings from "../pages/Settings";
import useAuthStore from "../store/authStore";
import useUnitStore from "../store/unitStore";

function renderSettings() {
	return render(
		<MemoryRouter>
			<Settings />
		</MemoryRouter>,
	);
}

// Mock the CSS
vi.mock("../pages/Settings.css", () => ({}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => ({
	...(await importOriginal()),
	useNavigate: () => mockNavigate,
}));

// Personal records feed the privacy preview
vi.mock("../hooks/usePRs", () => ({ default: vi.fn() }));

// Mock the api module directly (Settings.jsx calls api.get/post/put directly)
vi.mock("../api", () => ({
	default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

// Mock useUserProfile to control goals state
vi.mock("../hooks/useUserProfile", () => ({
	default: vi.fn(),
}));

// Mock data hooks used by export/import section
vi.mock("../hooks/useWeightLog", () => ({ default: vi.fn() }));
vi.mock("../hooks/useNutrition", () => ({ default: vi.fn() }));
vi.mock("../hooks/useWorkouts", () => ({ default: vi.fn() }));
vi.mock("../hooks/useSteps", () => ({ default: vi.fn() }));

// Mock xlsx library
vi.mock("xlsx", () => ({
	utils: {
		json_to_sheet: vi.fn(() => ({})),
		book_new: vi.fn(() => ({})),
		book_append_sheet: vi.fn(),
	},
	writeFile: vi.fn(),
}));

import api from "../api";
import useUserProfile from "../hooks/useUserProfile";
import useWeightLog from "../hooks/useWeightLog";
import useNutrition from "../hooks/useNutrition";
import useWorkouts from "../hooks/useWorkouts";
import useSteps from "../hooks/useSteps";
import usePRs from "../hooks/usePRs";
import * as XLSX from "xlsx";

const DEFAULT_GOALS = {
	calorieTargetTraining: 2600,
	calorieTargetRest: 2000,
	proteinTarget: 180,
};

function setupProfile(overrides = {}) {
	useUserProfile.mockReturnValue({
		goals: DEFAULT_GOALS,
		loading: false,
		saving: false,
		error: null,
		saveGoals: vi.fn(),
		...overrides,
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	useAuthStore.setState({ authenticated: true, username: "alice" });
	// Route-specific API GET mocks: email + privacy endpoints
	api.get.mockImplementation((url) => {
		if (url === "/profile/privacy")
			return Promise.resolve({
				data: { shareData: false, shareCalendar: false },
			});
		return Promise.resolve({ data: { email: "alice@example.com" } });
	});
	// Default empty data sets for export/import section
	useWeightLog.mockReturnValue({ data: [], refetch: vi.fn() });
	useNutrition.mockReturnValue({ data: [], refetch: vi.fn() });
	useWorkouts.mockReturnValue({ data: [], refetch: vi.fn() });
	useSteps.mockReturnValue({ data: [], refetch: vi.fn() });
	usePRs.mockReturnValue({ data: [] });
});

// Goals row: shows the current targets; opening it shows the edit form.
async function openGoals() {
	await userEvent.click(
		screen.getByRole("button", { name: /calorie & protein goals/i }),
	);
}

describe("Settings — goals row", () => {
	it("shows loading in the goals row while goals are loading", () => {
		setupProfile({ loading: true });
		renderSettings();
		expect(screen.getAllByText(/loading…/i).length).toBeGreaterThan(0);
	});

	it("summarizes the current goals in the row", () => {
		setupProfile();
		renderSettings();
		expect(
			screen.getByRole("button", { name: /calorie & protein goals/i }),
		).toHaveTextContent("2,600 / 2,000 kcal · 180 g");
		expect(screen.queryByLabelText(/training day/i)).not.toBeInTheDocument();
	});

	it("opens the form under the row, populated with the goals", async () => {
		setupProfile();
		renderSettings();
		await openGoals();
		expect(
			screen.getByRole("button", { name: /calorie & protein goals/i }),
		).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByLabelText(/training day/i)).toHaveValue(2600);
		expect(screen.getByLabelText(/rest day/i)).toHaveValue(2000);
		expect(screen.getByLabelText(/daily protein/i)).toHaveValue(180);
	});

	it("keeps Save disabled until a value changes and flags unsaved changes", async () => {
		setupProfile();
		renderSettings();
		await openGoals();
		const save = screen.getByRole("button", { name: /save goals/i });
		expect(save).toBeDisabled();
		expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();

		await userEvent.clear(screen.getByLabelText(/training day/i));
		await userEvent.type(screen.getByLabelText(/training day/i), "2800");

		expect(save).toBeEnabled();
		expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
	});

	it("calls saveGoals with parsed integers, closes the form and shows Saved!", async () => {
		const saveGoals = vi.fn().mockResolvedValue({});
		setupProfile({ saveGoals });
		renderSettings();
		await openGoals();

		await userEvent.clear(screen.getByLabelText(/training day/i));
		await userEvent.type(screen.getByLabelText(/training day/i), "2800");
		await userEvent.click(screen.getByRole("button", { name: /save goals/i }));

		await waitFor(() =>
			expect(saveGoals).toHaveBeenCalledWith({
				calorieTargetTraining: 2800,
				calorieTargetRest: 2000,
				proteinTarget: 180,
			}),
		);
		expect(await screen.findByText(/saved!/i)).toBeInTheDocument();
		expect(screen.queryByLabelText(/training day/i)).not.toBeInTheDocument();
	});

	it("Cancel closes the form without saving", async () => {
		const saveGoals = vi.fn();
		setupProfile({ saveGoals });
		renderSettings();
		await openGoals();
		await userEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
		expect(screen.queryByLabelText(/training day/i)).not.toBeInTheDocument();
		expect(saveGoals).not.toHaveBeenCalled();
	});

	it("shows the hook error inside the open form", async () => {
		setupProfile({ error: "Failed to save goals" });
		renderSettings();
		await openGoals();
		expect(screen.getByText(/failed to save goals/i)).toBeInTheDocument();
	});
});

describe("Settings — preferences", () => {
	beforeEach(() => {
		useUnitStore.setState({ unit: "lbs" });
		localStorage.removeItem("theme");
	});

	it("weight unit is a lbs | kg choice that switches the unit", async () => {
		setupProfile();
		renderSettings();
		const group = screen.getByRole("group", { name: /weight unit/i });
		const lbs = within(group).getByRole("button", { name: "lbs" });
		const kg = within(group).getByRole("button", { name: "kg" });
		expect(lbs).toHaveAttribute("aria-pressed", "true");

		await userEvent.click(kg);

		expect(useUnitStore.getState().unit).toBe("kg");
		expect(kg).toHaveAttribute("aria-pressed", "true");
		expect(lbs).toHaveAttribute("aria-pressed", "false");
	});

	it("clicking the unit that is already selected keeps it", async () => {
		setupProfile();
		renderSettings();
		const group = screen.getByRole("group", { name: /weight unit/i });
		await userEvent.click(within(group).getByRole("button", { name: "lbs" }));
		expect(useUnitStore.getState().unit).toBe("lbs");
	});

	it("theme offers Light, Dark and System and saves the choice", async () => {
		setupProfile();
		renderSettings();
		const group = screen.getByRole("group", { name: /theme/i });
		expect(
			within(group).getByRole("button", { name: "Light" }),
		).toHaveAttribute("aria-pressed", "true");

		await userEvent.click(within(group).getByRole("button", { name: "Dark" }));
		expect(localStorage.getItem("theme")).toBe("dark");
		expect(document.documentElement.classList.contains("dark")).toBe(true);

		await userEvent.click(
			within(group).getByRole("button", { name: "System" }),
		);
		expect(localStorage.getItem("theme")).toBe("system");
		expect(
			within(group).getByRole("button", { name: "System" }),
		).toHaveAttribute("aria-pressed", "true");
	});
});

describe("Settings — integrations", () => {
	it("the Claude row opens the setup page", async () => {
		setupProfile();
		renderSettings();
		await userEvent.click(
			screen.getByRole("button", { name: /claude integration/i }),
		);
		expect(mockNavigate).toHaveBeenCalledWith("/claude-setup");
	});
});

describe("Settings — privacy preview", () => {
	it("previews what others see using the top two lifts", async () => {
		usePRs.mockReturnValue({
			data: [
				{ exerciseName: "Curl", maxWeightLbs: 40 },
				{ exerciseName: "Squats", maxWeightLbs: 275 },
				{ exerciseName: "Bench Press", maxWeightLbs: 225 },
			],
		});
		setupProfile();
		renderSettings();
		expect(
			await screen.findByText(
				"Others see: alice · Squats 275 lbs · Bench Press 225 lbs",
			),
		).toBeInTheDocument();
	});
});

describe("Settings — account rows", () => {
	async function waitForEmail() {
		await waitFor(() =>
			expect(screen.getByRole("button", { name: /^email/i })).toHaveTextContent(
				"alice@example.com",
			),
		);
	}

	it("shows username and email as rows, with no form open", async () => {
		setupProfile();
		renderSettings();
		expect(
			screen.getByRole("button", { name: /^username/i }),
		).toHaveTextContent("alice");
		await waitForEmail();
		expect(
			screen.queryByLabelText(/current password/i),
		).not.toBeInTheDocument();
	});

	it("changes the username with the current password", async () => {
		api.put.mockResolvedValue({ data: { username: "bob" } });
		setupProfile();
		renderSettings();
		await userEvent.click(screen.getByRole("button", { name: /^username/i }));
		await userEvent.type(screen.getByLabelText(/new username/i), "bob");
		await userEvent.type(
			screen.getByLabelText(/current password/i),
			"pw123456",
		);
		await userEvent.click(
			screen.getByRole("button", { name: /save username/i }),
		);

		await waitFor(() =>
			expect(api.put).toHaveBeenCalledWith("/profile/credentials", {
				currentPassword: "pw123456",
				newUsername: "bob",
			}),
		);
		await waitFor(() => expect(useAuthStore.getState().username).toBe("bob"));
		expect(screen.queryByLabelText(/new username/i)).not.toBeInTheDocument();
	});

	it("shows the server error when the username change fails", async () => {
		api.put.mockRejectedValue({
			response: { data: { message: "Username already exists" } },
		});
		setupProfile();
		renderSettings();
		await userEvent.click(screen.getByRole("button", { name: /^username/i }));
		await userEvent.type(screen.getByLabelText(/new username/i), "taken");
		await userEvent.type(
			screen.getByLabelText(/current password/i),
			"pw123456",
		);
		await userEvent.click(
			screen.getByRole("button", { name: /save username/i }),
		);

		expect(
			await screen.findByText(/username already exists/i),
		).toBeInTheDocument();
	});

	it("changes the email after verifying the current password", async () => {
		api.post.mockResolvedValue({});
		api.put.mockResolvedValue({});
		setupProfile();
		renderSettings();
		await waitForEmail();
		await userEvent.click(screen.getByRole("button", { name: /^email/i }));
		await userEvent.type(
			screen.getByLabelText(/new email/i),
			"new@example.com",
		);
		await userEvent.type(
			screen.getByLabelText(/current password/i),
			"pw123456",
		);
		await userEvent.click(screen.getByRole("button", { name: /save email/i }));

		await waitFor(() =>
			expect(api.put).toHaveBeenCalledWith("/profile/email", {
				email: "new@example.com",
			}),
		);
		expect(api.post).toHaveBeenCalledWith("/profile/verify-password", {
			password: "pw123456",
		});
		await waitFor(() =>
			expect(screen.getByRole("button", { name: /^email/i })).toHaveTextContent(
				"new@example.com",
			),
		);
	});

	it("does not save the email when the password is wrong", async () => {
		api.post.mockRejectedValue({
			response: { data: { message: "Incorrect password." } },
		});
		setupProfile();
		renderSettings();
		await waitForEmail();
		await userEvent.click(screen.getByRole("button", { name: /^email/i }));
		await userEvent.type(
			screen.getByLabelText(/new email/i),
			"new@example.com",
		);
		await userEvent.type(screen.getByLabelText(/current password/i), "wrong");
		await userEvent.click(screen.getByRole("button", { name: /save email/i }));

		expect(await screen.findByText(/incorrect password/i)).toBeInTheDocument();
		expect(api.put).not.toHaveBeenCalled();
	});

	it("rejects an unchanged email without calling the API", async () => {
		setupProfile();
		renderSettings();
		await waitForEmail();
		await userEvent.click(screen.getByRole("button", { name: /^email/i }));
		await userEvent.type(
			screen.getByLabelText(/new email/i),
			"alice@example.com",
		);
		await userEvent.type(
			screen.getByLabelText(/current password/i),
			"pw123456",
		);
		await userEvent.click(screen.getByRole("button", { name: /save email/i }));

		expect(await screen.findByText(/already your email/i)).toBeInTheDocument();
		expect(api.post).not.toHaveBeenCalled();
		expect(api.put).not.toHaveBeenCalled();
	});

	it("changes the password when the confirmation matches", async () => {
		api.put.mockResolvedValue({ data: { username: "alice" } });
		setupProfile();
		renderSettings();
		await userEvent.click(screen.getByRole("button", { name: /^password/i }));
		await userEvent.type(
			screen.getByLabelText(/current password/i),
			"oldpass1",
		);
		await userEvent.type(screen.getByLabelText(/^new password/i), "newpass1");
		await userEvent.type(
			screen.getByLabelText(/confirm new password/i),
			"newpass1",
		);
		await userEvent.click(
			screen.getByRole("button", { name: /update password/i }),
		);

		await waitFor(() =>
			expect(api.put).toHaveBeenCalledWith("/profile/credentials", {
				currentPassword: "oldpass1",
				newPassword: "newpass1",
			}),
		);
	});

	it("blocks a password change when the confirmation does not match", async () => {
		setupProfile();
		renderSettings();
		await userEvent.click(screen.getByRole("button", { name: /^password/i }));
		await userEvent.type(
			screen.getByLabelText(/current password/i),
			"oldpass1",
		);
		await userEvent.type(screen.getByLabelText(/^new password/i), "newpass1");
		await userEvent.type(
			screen.getByLabelText(/confirm new password/i),
			"newpass2",
		);
		await userEvent.click(
			screen.getByRole("button", { name: /update password/i }),
		);

		expect(
			await screen.findByText(/passwords don.t match/i),
		).toBeInTheDocument();
		expect(api.put).not.toHaveBeenCalled();
	});

	it("blocks a new password shorter than 6 characters", async () => {
		setupProfile();
		renderSettings();
		await userEvent.click(screen.getByRole("button", { name: /^password/i }));
		await userEvent.type(
			screen.getByLabelText(/current password/i),
			"oldpass1",
		);
		await userEvent.type(screen.getByLabelText(/^new password/i), "abc");
		await userEvent.type(screen.getByLabelText(/confirm new password/i), "abc");
		await userEvent.click(
			screen.getByRole("button", { name: /update password/i }),
		);

		expect(
			await screen.findByText(/must be at least 6 characters/i),
		).toBeInTheDocument();
		expect(api.put).not.toHaveBeenCalled();
	});

	it("Show passwords reveals the password fields", async () => {
		setupProfile();
		renderSettings();
		await userEvent.click(screen.getByRole("button", { name: /^password/i }));
		expect(screen.getByLabelText(/^new password/i)).toHaveAttribute(
			"type",
			"password",
		);
		await userEvent.click(screen.getByLabelText(/show passwords/i));
		expect(screen.getByLabelText(/^new password/i)).toHaveAttribute(
			"type",
			"text",
		);
	});

	it("opening one row closes the other", async () => {
		setupProfile();
		renderSettings();
		await userEvent.click(screen.getByRole("button", { name: /^username/i }));
		expect(screen.getByLabelText(/new username/i)).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: /^password/i }));
		expect(screen.queryByLabelText(/new username/i)).not.toBeInTheDocument();
		expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
	});

	it("Log out ends the session", async () => {
		api.post.mockResolvedValue({});
		setupProfile();
		renderSettings();
		await userEvent.click(screen.getByRole("button", { name: /^log out$/i }));
		expect(api.post).toHaveBeenCalledWith("/auth/logout");
		expect(useAuthStore.getState().authenticated).toBe(false);
	});
});

describe("Settings — phone layout", () => {
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

	it("opens a typed edit in a bottom sheet dialog instead of under the row", async () => {
		setupProfile();
		renderSettings();
		await openGoals();
		const dialog = screen.getByRole("dialog");
		expect(within(dialog).getByLabelText(/training day/i)).toHaveValue(2600);

		await userEvent.click(
			within(dialog).getByRole("button", { name: /^close$/i }),
		);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});
});

describe("Settings — data export & import", () => {
	it("renders the Data section with export and import controls", () => {
		setupProfile();
		renderSettings();
		expect(
			screen.getByText("Data", { selector: ".settings-group-title" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /export.*xlsx/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /export.*json/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /choose json file/i }),
		).toBeInTheDocument();
	});

	it("disables export buttons when no data is available", () => {
		setupProfile();
		renderSettings();
		expect(
			screen.getByRole("button", { name: /export.*xlsx/i }),
		).toBeDisabled();
		expect(
			screen.getByRole("button", { name: /export.*json/i }),
		).toBeDisabled();
	});

	it("enables export buttons when there is data", () => {
		setupProfile();
		useWeightLog.mockReturnValue({
			data: [{ logDate: "2026-04-01", weightLbs: 180 }],
			refetch: vi.fn(),
		});
		renderSettings();
		expect(screen.getByRole("button", { name: /export.*xlsx/i })).toBeEnabled();
		expect(screen.getByRole("button", { name: /export.*json/i })).toBeEnabled();
	});

	it("triggers XLSX export when XLSX button clicked", async () => {
		setupProfile();
		useWeightLog.mockReturnValue({
			data: [{ logDate: "2026-04-01", weightLbs: 180 }],
			refetch: vi.fn(),
		});
		renderSettings();
		await userEvent.click(
			screen.getByRole("button", { name: /export.*xlsx/i }),
		);
		expect(XLSX.writeFile).toHaveBeenCalled();
	});

	it("triggers JSON download when JSON button clicked", async () => {
		setupProfile();
		useWeightLog.mockReturnValue({
			data: [{ logDate: "2026-04-01", weightLbs: 180 }],
			refetch: vi.fn(),
		});
		// jsdom needs URL.createObjectURL stubbed
		const createObjectURL = vi.fn(() => "blob:fake-url");
		const revokeObjectURL = vi.fn();
		global.URL.createObjectURL = createObjectURL;
		global.URL.revokeObjectURL = revokeObjectURL;
		renderSettings();
		await userEvent.click(
			screen.getByRole("button", { name: /export.*json/i }),
		);
		expect(createObjectURL).toHaveBeenCalled();
	});

	it("shows success status after a successful import", async () => {
		api.post.mockResolvedValue({
			data: {
				weightImported: 2,
				weightSkipped: 0,
				nutritionImported: 1,
				nutritionSkipped: 0,
				workoutsImported: 0,
				workoutsSkipped: 0,
			},
		});
		setupProfile();
		renderSettings();

		const fileInput = document.querySelector('input[type="file"]');
		expect(fileInput).toBeTruthy();

		const file = new File(
			[JSON.stringify({ totalStats: [], workouts: [] })],
			"data.json",
			{
				type: "application/json",
			},
		);
		await userEvent.upload(fileInput, file);

		await waitFor(() =>
			expect(screen.getByText(/imported/i)).toBeInTheDocument(),
		);
		expect(api.post).toHaveBeenCalledWith("/import", expect.any(Object));
	});

	it("shows error status when import fails", async () => {
		api.post.mockRejectedValue(new Error("bad payload"));
		setupProfile();
		renderSettings();

		const fileInput = document.querySelector('input[type="file"]');
		const file = new File(["not json"], "bad.json", {
			type: "application/json",
		});
		await userEvent.upload(fileInput, file);

		await waitFor(() =>
			expect(screen.getByText(/import failed/i)).toBeInTheDocument(),
		);
	});
});

const NUTRITION_DATA = [
	{
		logDate: "2026-04-01",
		dayType: "training",
		totalCalories: 1200,
		totalProtein: 80,
		meals: [
			{ id: 1, mealName: "Breakfast", calories: 500, proteinGrams: 30 },
			{ id: 2, mealName: "Lunch", calories: 700, proteinGrams: 50 },
		],
	},
];

describe("Settings — export handles nutrition meals", () => {
	beforeEach(() => {
		setupProfile();
		useNutrition.mockReturnValue({ data: NUTRITION_DATA, refetch: vi.fn() });
	});

	it("XLSX export creates three sheets including Nutrition", async () => {
		renderSettings();
		await userEvent.click(
			screen.getByRole("button", { name: /export.*xlsx/i }),
		);
		const sheetNames = XLSX.utils.book_append_sheet.mock.calls.map((c) => c[2]);
		expect(sheetNames).toEqual(["Total Stats", "Workouts", "Nutrition"]);
	});

	it("JSON export includes a nutrition key with per-meal rows", async () => {
		let capturedJson = null;
		const OrigBlob = global.Blob;
		global.Blob = class {
			constructor(data) {
				capturedJson = data[0];
			}
		};
		global.URL.createObjectURL = vi.fn(() => "blob:x");
		global.URL.revokeObjectURL = vi.fn();

		renderSettings();
		await userEvent.click(
			screen.getByRole("button", { name: /export.*json/i }),
		);

		const parsed = JSON.parse(capturedJson);
		expect(parsed).toHaveProperty("nutrition");
		expect(parsed.nutrition).toHaveLength(2);
		expect(parsed.nutrition[0]).toMatchObject({
			Meal: "Breakfast",
			Calories: 500,
			Protein: 30,
			"Day Type": "Training",
		});
		expect(parsed.nutrition[1]).toMatchObject({
			Meal: "Lunch",
			Calories: 700,
			Protein: 50,
			"Day Type": "Training",
		});
		global.Blob = OrigBlob;
	});

	it("JSON export puts the meal label in its own Label column", async () => {
		useNutrition.mockReturnValue({
			data: [
				{
					...NUTRITION_DATA[0],
					meals: [
						{
							id: 1,
							mealLabel: "Breakfast",
							mealName: "Oatmeal",
							calories: 500,
							proteinGrams: 30,
						},
					],
				},
			],
			refetch: vi.fn(),
		});
		let capturedJson = null;
		const OrigBlob = global.Blob;
		global.Blob = class {
			constructor(data) {
				capturedJson = data[0];
			}
		};
		global.URL.createObjectURL = vi.fn(() => "blob:x");
		global.URL.revokeObjectURL = vi.fn();

		renderSettings();
		await userEvent.click(
			screen.getByRole("button", { name: /export.*json/i }),
		);

		expect(JSON.parse(capturedJson).nutrition[0]).toMatchObject({
			Label: "Breakfast",
			Meal: "Oatmeal",
			Calories: 500,
		});
		global.Blob = OrigBlob;
	});

	it("nutrition totals in totalStats are still exported", async () => {
		let capturedJson = null;
		const OrigBlob = global.Blob;
		global.Blob = class {
			constructor(data) {
				capturedJson = data[0];
			}
		};
		global.URL.createObjectURL = vi.fn(() => "blob:x");
		global.URL.revokeObjectURL = vi.fn();

		renderSettings();
		await userEvent.click(
			screen.getByRole("button", { name: /export.*json/i }),
		);

		const parsed = JSON.parse(capturedJson);
		const statsRow = parsed.totalStats.find(
			(r) => r.Date !== "" && r.Calories !== "",
		);
		expect(statsRow).toBeDefined();
		expect(statsRow.Calories).toBe(1200);
		expect(statsRow.Protein).toBe(80);
		global.Blob = OrigBlob;
	});
});

describe("Settings — export is lifts only", () => {
	beforeEach(() => {
		setupProfile();
		useWorkouts.mockReturnValue({
			data: [
				{
					sessionDate: "2026-04-01",
					exerciseSets: [
						{
							exerciseName: "Bench Press",
							setNumber: 1,
							reps: 8,
							weightLbs: "135",
							completed: true,
						},
					],
				},
			],
			refetch: vi.fn(),
		});
	});

	it("JSON export has no cardio section", async () => {
		let capturedJson = null;
		const OrigBlob = global.Blob;
		global.Blob = class {
			constructor(data) {
				capturedJson = data[0];
			}
		};
		global.URL.createObjectURL = vi.fn(() => "blob:x");
		global.URL.revokeObjectURL = vi.fn();

		renderSettings();
		await userEvent.click(
			screen.getByRole("button", { name: /export.*json/i }),
		);

		const parsed = JSON.parse(capturedJson);
		expect(parsed).not.toHaveProperty("cardio");
		expect(parsed.workouts.map((r) => r.Exercise)).toEqual(["Bench Press"]);
		global.Blob = OrigBlob;
	});
});

describe("Settings — privacy / data sharing", () => {
	it("renders the Privacy section heading", async () => {
		setupProfile();
		renderSettings();
		await waitFor(() =>
			expect(screen.getByText("Privacy")).toBeInTheDocument(),
		);
	});

	it("shows the Share Data on Leaderboard label", async () => {
		setupProfile();
		renderSettings();
		await waitFor(() =>
			expect(
				screen.getByText(/share data on leaderboard/i),
			).toBeInTheDocument(),
		);
	});

	it("toggle starts as Off when shareData is false", async () => {
		setupProfile();
		renderSettings();
		await waitFor(() => {
			const offLabel = screen.getAllByText(/^off$/i);
			expect(offLabel.length).toBeGreaterThan(0);
		});
	});

	it("clicking the toggle calls PUT /profile/privacy with shareData true", async () => {
		api.put.mockResolvedValue({ data: { shareData: true } });
		setupProfile();
		renderSettings();

		await waitFor(() =>
			expect(
				screen.getByText(/share data on leaderboard/i),
			).toBeInTheDocument(),
		);

		const toggle = screen.getByRole("button", { name: /toggle data sharing/i });
		await userEvent.click(toggle);

		await waitFor(() =>
			expect(api.put).toHaveBeenCalledWith("/profile/privacy", {
				shareData: true,
				shareCalendar: false,
			}),
		);
	});

	it("reverts the toggle on PUT failure", async () => {
		api.put.mockRejectedValue({
			response: { data: { message: "Server error" } },
		});
		setupProfile();
		renderSettings();

		await waitFor(() =>
			expect(
				screen.getByText(/share data on leaderboard/i),
			).toBeInTheDocument(),
		);

		const toggle = screen.getByRole("button", { name: /toggle data sharing/i });
		await userEvent.click(toggle);

		await waitFor(() =>
			expect(screen.getByText(/server error/i)).toBeInTheDocument(),
		);
	});

	it("shows shareData as On when API returns true", async () => {
		api.get.mockImplementation((url) => {
			if (url === "/profile/privacy")
				return Promise.resolve({
					data: { shareData: true, shareCalendar: false },
				});
			return Promise.resolve({ data: { email: "alice@example.com" } });
		});
		setupProfile();
		renderSettings();

		await waitFor(() => {
			const onLabel = screen.getAllByText(/^on$/i);
			expect(onLabel.length).toBeGreaterThan(0);
		});
	});

	it("shows the Share Calendar label", async () => {
		setupProfile();
		renderSettings();
		await waitFor(() =>
			expect(
				screen.getByText(/share on community calendar/i),
			).toBeInTheDocument(),
		);
	});

	it("clicking the calendar toggle PUTs shareCalendar=true while preserving shareData", async () => {
		api.put.mockResolvedValue({
			data: { shareData: false, shareCalendar: true },
		});
		setupProfile();
		renderSettings();

		await waitFor(() =>
			expect(
				screen.getByText(/share on community calendar/i),
			).toBeInTheDocument(),
		);

		const toggle = screen.getByRole("button", {
			name: /toggle calendar sharing/i,
		});
		await userEvent.click(toggle);

		await waitFor(() =>
			expect(api.put).toHaveBeenCalledWith("/profile/privacy", {
				shareData: false,
				shareCalendar: true,
			}),
		);
	});

	it("shows shareCalendar as On when API returns true", async () => {
		api.get.mockImplementation((url) => {
			if (url === "/profile/privacy")
				return Promise.resolve({
					data: { shareData: false, shareCalendar: true },
				});
			return Promise.resolve({ data: { email: "alice@example.com" } });
		});
		setupProfile();
		renderSettings();

		await waitFor(() => {
			const toggle = screen.getByRole("button", {
				name: /toggle calendar sharing/i,
			});
			expect(toggle).toHaveAttribute("aria-pressed", "true");
		});
	});
});

describe("Settings — import refreshes every data type", () => {
	it("refetches steps after a successful import", async () => {
		const refetchSteps = vi.fn();
		useSteps.mockReturnValue({ data: [], refetch: refetchSteps });
		api.post.mockResolvedValue({
			data: {
				weightImported: 0,
				weightSkipped: 0,
				nutritionImported: 0,
				nutritionSkipped: 0,
				workoutsImported: 0,
				workoutsSkipped: 0,
				stepsImported: 3,
				stepsSkipped: 0,
			},
		});
		setupProfile();
		renderSettings();

		const file = new File([JSON.stringify({ totalStats: [] })], "data.json", {
			type: "application/json",
		});
		await userEvent.upload(document.querySelector('input[type="file"]'), file);

		await waitFor(() => expect(refetchSteps).toHaveBeenCalled());
	});
});

describe("Settings — switches work from the keyboard", () => {
	it("the data sharing switch toggles with the Space key", async () => {
		api.put.mockResolvedValue({});
		setupProfile();
		renderSettings();
		const toggle = await screen.findByRole("button", {
			name: /toggle data sharing/i,
		});
		expect(toggle.tagName).toBe("BUTTON");

		toggle.focus();
		await userEvent.keyboard(" ");

		await waitFor(() =>
			expect(api.put).toHaveBeenCalledWith(
				"/profile/privacy",
				expect.objectContaining({ shareData: true }),
			),
		);
	});

	it("the calendar sharing switch is a focusable button", async () => {
		setupProfile();
		renderSettings();
		const toggle = await screen.findByRole("button", {
			name: /toggle calendar sharing/i,
		});
		expect(toggle.tagName).toBe("BUTTON");
	});

	it("disables a privacy switch while its change is saving", async () => {
		let finish;
		api.put.mockReturnValue(new Promise((resolve) => (finish = resolve)));
		setupProfile();
		renderSettings();
		const toggle = await screen.findByRole("button", {
			name: /toggle data sharing/i,
		});

		await userEvent.click(toggle);
		expect(toggle).toBeDisabled();

		finish({});
		await waitFor(() => expect(toggle).toBeEnabled());
	});
});
