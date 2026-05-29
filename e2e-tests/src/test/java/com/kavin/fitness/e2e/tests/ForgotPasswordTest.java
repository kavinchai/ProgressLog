package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.LoginPage;
import com.kavin.fitness.e2e.support.Browsers;
import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import org.testng.Reporter;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

/**
 * E2E coverage for the forgot-password flow on /login. We exercise the UI:
 *   - the "Forgot password?" link toggles to the request form
 *   - submitting username + email always shows the same generic confirmation
 *     (so the UI does not reveal whether the username exists)
 *   - the back-to-sign-in link returns to login mode
 *
 * The reset-password page itself is covered by frontend unit tests; verifying
 * the email contents end-to-end requires SMTP infrastructure and is out of
 * scope for this test.
 */
public class ForgotPasswordTest {

    private Playwright playwright;
    private Browser browser;
    private BrowserContext context;
    private Page page;
    private LoginPage loginPage;
    private String baseUrl;

    @BeforeClass(alwaysRun = true)
    public void setUp() {
        baseUrl = System.getProperty("env.baseurl", "http://localhost:5173");
        playwright = Browsers.newPlaywright();
        browser = Browsers.chromium(playwright);
        context = browser.newContext(new Browser.NewContextOptions().setViewportSize(1920, 1080));
        page = context.newPage();
        page.setDefaultTimeout(10_000);
        loginPage = new LoginPage(page);
    }

    @AfterClass(alwaysRun = true)
    public void tearDown() {
        if (context != null) context.close();
        if (browser != null) browser.close();
        if (playwright != null) playwright.close();
    }

    private void step(String msg) {
        System.out.println("  STEP: " + msg);
        Reporter.log(msg, false);
    }

    @Test(priority = 1)
    public void forgotPasswordLinkTogglesToRequestForm() {
        step("open /login");
        loginPage.open(baseUrl);

        step("verify the password field is visible in login mode");
        if (!page.locator("#password").isVisible()) {
            throw new AssertionError("Expected password field in login mode");
        }

        step("click 'Forgot password?'");
        loginPage.openForgotPassword();

        step("verify email field appears and password field is hidden");
        if (!page.locator("#email").isVisible()) {
            throw new AssertionError("Expected email field after toggling forgot password");
        }
        if (page.locator("#password").count() > 0 && page.locator("#password").isVisible()) {
            throw new AssertionError("Password field should not be visible in forgot-password mode");
        }
    }

    @Test(priority = 2)
    public void submittingForgotPasswordShowsGenericConfirmation() {
        step("open /login and toggle forgot password");
        loginPage.open(baseUrl);
        loginPage.openForgotPassword();

        step("submit a username + email (existence not asserted — endpoint never reveals it)");
        loginPage.submitForgotPassword("nonexistent_user_xyz", "nobody@example.com");

        step("verify confirmation banner appears with generic text");
        String msg = loginPage.forgotPasswordConfirmationText();
        if (msg == null || !msg.toLowerCase().contains("check your email")) {
            throw new AssertionError("Expected generic confirmation, got: " + msg);
        }
        if (msg.toLowerCase().contains("not found") || msg.toLowerCase().contains("no such")) {
            throw new AssertionError("Confirmation should not reveal account existence: " + msg);
        }
    }

    @Test(priority = 3)
    public void backToSignInReturnsToLoginMode() {
        step("open /login and toggle forgot password");
        loginPage.open(baseUrl);
        loginPage.openForgotPassword();

        step("click 'Back to sign in'");
        page.locator(".login-switch-btn").first().click();

        step("verify password field is back");
        page.locator("#password").waitFor();
        if (!page.locator("#password").isVisible()) {
            throw new AssertionError("Expected password field after returning to login mode");
        }
    }
}
