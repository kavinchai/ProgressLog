package com.kavin.fitness.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;

/** Forgot password: ask for a 6-digit code, then enter it with a new password. */
public class ForgotPasswordPage {
    private final Page page;

    private static final String IDENTIFIER = "#identifier";
    private static final String CODE = "#reset-code";
    private static final String NEW_PASSWORD = "#new-password";
    private static final String CONFIRM = "#confirm-password";
    private static final String SUBMIT = "button.login-btn[type='submit']";
    private static final String ERROR = ".login-error";

    public ForgotPasswordPage(Page page) {
        this.page = page;
    }

    public ForgotPasswordPage open(String baseUrl) {
        page.navigate(baseUrl + "/forgot-password");
        page.locator(IDENTIFIER).waitFor();
        return this;
    }

    /** Sends the code request and waits for the "Check your email" step. */
    public ForgotPasswordPage requestCode(String identifier) {
        page.locator(IDENTIFIER).fill(identifier);
        page.locator(SUBMIT).click();
        page.locator(CODE).waitFor();
        return this;
    }

    public boolean isOnCodeStep() {
        return page.getByRole(AriaRole.HEADING,
                new Page.GetByRoleOptions().setName("Check your email")).isVisible();
    }

    public void submitCode(String code, String newPassword) {
        page.locator(CODE).fill(code);
        page.locator(NEW_PASSWORD).fill(newPassword);
        page.locator(CONFIRM).fill(newPassword);
        page.locator(SUBMIT).click();
    }

    /** Waits up to 5s for the error above the form; "" if none shows. */
    public String awaitError() {
        try {
            Locator error = page.locator(ERROR).first();
            error.waitFor(new Locator.WaitForOptions().setTimeout(5000));
            return error.innerText();
        } catch (Exception e) {
            return "";
        }
    }

    /** Follows "‹ Sign in" back to the login page. */
    public void backToSignIn() {
        page.locator("a.login-back").click();
        page.locator("#username").waitFor();
    }
}
