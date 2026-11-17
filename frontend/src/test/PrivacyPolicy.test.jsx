import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PrivacyPolicy from "../pages/PrivacyPolicy";

vi.mock("../pages/PrivacyPolicy.css", () => ({}));

function renderPolicy() {
	return render(
		<MemoryRouter>
			<PrivacyPolicy />
		</MemoryRouter>,
	);
}

describe("PrivacyPolicy", () => {
	it("shows the title and effective date", () => {
		renderPolicy();
		expect(
			screen.getByRole("heading", { level: 1, name: /privacy policy/i }),
		).toBeInTheDocument();
		expect(
			screen.getByText(/effective november 16, 2026/i),
		).toBeInTheDocument();
	});

	it("lists the data collected", () => {
		renderPolicy();
		for (const item of [/username/i, /email/i, /workouts/i, /weight/i]) {
			expect(screen.getAllByText(item).length).toBeGreaterThan(0);
		}
	});

	it("explains how to delete the account in the app", () => {
		renderPolicy();
		expect(
			screen.getByText(/settings › account › delete account/i),
		).toBeInTheDocument();
	});

	it("explains the optional Apple Health import", () => {
		renderPolicy();
		expect(
			screen.getByRole("heading", { level: 2, name: /apple health/i }),
		).toBeInTheDocument();
		expect(
			screen.getByText(/never writes to apple health/i),
		).toBeInTheDocument();
	});

	it("explains Sign in with Apple and that deleting revokes it", () => {
		renderPolicy();
		expect(
			screen.getByRole("heading", { level: 2, name: /sign in with apple/i }),
		).toBeInTheDocument();
		expect(screen.getByText(/hide my email/i)).toBeInTheDocument();
		expect(
			screen.getByText(/ask apple to revoke progress logger/i),
		).toBeInTheDocument();
	});

	it("explains that Face ID data never reaches Progress Logger", () => {
		renderPolicy();
		expect(
			screen.getByRole("heading", { level: 2, name: /face id unlock/i }),
		).toBeInTheDocument();
		expect(
			screen.getByText(/never sees or stores your face data/i),
		).toBeInTheDocument();
	});

	it("gives a contact email link", () => {
		renderPolicy();
		expect(
			screen.getByRole("link", { name: "kavinchai00@gmail.com" }),
		).toHaveAttribute("href", "mailto:kavinchai00@gmail.com");
	});
});
