import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import ForgotPassword from "../pages/ForgotPassword";

vi.mock("../api", () => ({
	default: { post: vi.fn() },
}));
vi.mock("../pages/Login.css", () => ({}));

import api from "../api";

function LoginStub() {
	const { state } = useLocation();
	return (
		<p>
			Login page: {state?.notice} {state?.username}
		</p>
	);
}

function renderForgot() {
	return render(
		<MemoryRouter initialEntries={["/forgot-password"]}>
			<Routes>
				<Route path="/forgot-password" element={<ForgotPassword />} />
				<Route path="/login" element={<LoginStub />} />
			</Routes>
		</MemoryRouter>,
	);
}

async function askForCode(identifier = "alex") {
	await userEvent.type(screen.getByLabelText(/username or email/i), identifier);
	await userEvent.click(screen.getByRole("button", { name: /send code/i }));
	await screen.findByRole("heading", { name: /check your email/i });
}

async function fillCode(code, password, confirm = password) {
	await userEvent.type(screen.getByLabelText(/^code$/i), code);
	await userEvent.type(screen.getByLabelText(/^new password$/i), password);
	await userEvent.type(screen.getByLabelText(/^confirm password$/i), confirm);
	await userEvent.click(
		screen.getByRole("button", { name: /reset password/i }),
	);
}

beforeEach(() => {
	vi.clearAllMocks();
	api.post.mockResolvedValue({});
});

describe("ForgotPassword", () => {
	it("asks for a username or email and links back to sign in", () => {
		renderForgot();
		expect(
			screen.getByRole("heading", { name: /reset password/i }),
		).toBeInTheDocument();
		expect(screen.getByLabelText(/username or email/i)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
			"href",
			"/login",
		);
	});

	it("sends the code request, then asks for the code", async () => {
		renderForgot();
		await askForCode("  alex  ");

		expect(api.post).toHaveBeenCalledWith("/auth/forgot-password", {
			identifier: "alex",
		});
		expect(screen.getByText(/expires in 15 minutes/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^code$/i)).toHaveAttribute(
			"autocomplete",
			"one-time-code",
		);
	});

	it("resets the password and returns to sign in with a notice", async () => {
		renderForgot();
		await askForCode("alex");
		await fillCode("482916", "newpass1");

		expect(api.post).toHaveBeenCalledWith("/auth/reset-password", {
			identifier: "alex",
			code: "482916",
			newPassword: "newpass1",
		});
		expect(
			await screen.findByText(
				/password reset\. sign in with your new password/i,
			),
		).toBeInTheDocument();
		expect(screen.getByText(/alex/)).toBeInTheDocument();
	});

	it("doesn't send mismatched passwords", async () => {
		renderForgot();
		await askForCode();
		await fillCode("482916", "newpass1", "newpass2");

		expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
		expect(api.post).not.toHaveBeenCalledWith(
			"/auth/reset-password",
			expect.anything(),
		);
	});

	it("needs all six digits of the code", async () => {
		renderForgot();
		await askForCode();
		await fillCode("4829", "newpass1");

		expect(screen.getByText(/enter the 6-digit code/i)).toBeInTheDocument();
		expect(api.post).not.toHaveBeenCalledWith(
			"/auth/reset-password",
			expect.anything(),
		);
	});

	it("needs a password of at least 6 characters", async () => {
		renderForgot();
		await askForCode();
		await fillCode("482916", "abc");

		expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument();
		expect(api.post).not.toHaveBeenCalledWith(
			"/auth/reset-password",
			expect.anything(),
		);
	});

	it("shows the server's message when the code is wrong", async () => {
		renderForgot();
		await askForCode();
		api.post.mockRejectedValueOnce({
			response: { data: { message: "That code is incorrect or has expired." } },
		});
		await fillCode("000000", "newpass1");

		expect(
			await screen.findByText("That code is incorrect or has expired."),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: /check your email/i }),
		).toBeInTheDocument();
	});

	it("Resend code asks for another code", async () => {
		renderForgot();
		await askForCode("alex");
		await userEvent.click(screen.getByRole("button", { name: /resend code/i }));

		expect(api.post).toHaveBeenCalledTimes(2);
		expect(api.post).toHaveBeenLastCalledWith("/auth/forgot-password", {
			identifier: "alex",
		});
		expect(await screen.findByText(/sent another code/i)).toBeInTheDocument();
	});

	it("shows an error when the code can't be requested", async () => {
		api.post.mockRejectedValueOnce({ response: { status: 500 } });
		renderForgot();
		await userEvent.type(screen.getByLabelText(/username or email/i), "alex");
		await userEvent.click(screen.getByRole("button", { name: /send code/i }));

		expect(
			await screen.findByText(/couldn't send the code/i),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: /reset password/i }),
		).toBeInTheDocument();
	});
});
