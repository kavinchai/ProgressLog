package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.support.Browsers;
import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import org.testng.Reporter;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

/**
 * Tests for the Login page UI elements and error handling.
 * Uses a separate Page (not logged in) to test unauthenticated flows.
 */
public class LoginPageTest {
    private Playwright playwright;
    private Browser browser;
    private BrowserContext context;
    private Page page;
    private String baseUrl;

    @BeforeClass(alwaysRun = true)
    public void setUp() {
        baseUrl = System.getProperty("env.baseurl", "http://localhost:5173");
        playwright = Browsers.newPlaywright();
        browser = Browsers.chromium(playwright);
        context = browser.newContext(new Browser.NewContextOptions().setViewportSize(1920, 1080));
        page = context.newPage();
        page.setDefaultTimeout(10_000);
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
    public void loginPageDisplaysFormElements() {
        step("navigate to /login");
        page.navigate(baseUrl + "/login");
        page.locator("#username").waitFor();

        step("verify username input, password input, and submit button exist");
        assertElementExists("#username", "username input");
        assertElementExists("#password", "password input");
        assertElementExists("button.login-btn[type='submit']", "submit button");
    }

    @Test(priority = 2)
    public void loginPageShowsTitle() {
        step("navigate to /login");
        page.navigate(baseUrl + "/login");
        page.locator(".login-title").waitFor();

        step("verify title text");
        String title = page.locator(".login-title").innerText();
        if (!"ProgressLog".equals(title)) {
            throw new AssertionError("Expected title 'ProgressLog' but got: " + title);
        }
    }

    @Test(priority = 3)
    public void loginPageShowsSignUpToggle() {
        step("navigate to /login");
        page.navigate(baseUrl + "/login");
        page.locator(".login-switch-btn").waitFor();

        step("verify sign up toggle text");
        String switchText = page.locator(".login-switch-btn").innerText();
        if (!switchText.contains("Sign up")) {
            throw new AssertionError("Expected switch button to contain 'Sign up' but got: " + switchText);
        }
    }

    @Test(priority = 4)
    public void switchToSignUpShowsEmailField() {
        step("navigate to /login");
        page.navigate(baseUrl + "/login");
        page.locator(".login-switch-btn").waitFor();

        step("verify email field is NOT visible in login mode");
        Locator email = page.locator("#email");
        if (email.count() > 0 && email.first().isVisible()) {
            throw new AssertionError("Email field should not be visible in login mode");
        }

        step("click switch to sign up");
        page.locator(".login-switch-btn").click();

        step("verify email field IS visible in sign up mode");
        page.locator("#email").waitFor();
    }

    @Test(priority = 5)
    public void invalidLoginShowsError() {
        step("navigate to /login");
        page.navigate(baseUrl + "/login");
        page.locator("#username").waitFor();

        step("enter invalid credentials and submit");
        page.locator("#username").fill("nonexistent_user_xyz");
        page.locator("#password").fill("wrong_password_123");
        page.locator("button.login-btn[type='submit']").click();

        step("verify error message is displayed");
        page.locator(".login-error").waitFor();
        String error = page.locator(".login-error").innerText();
        if (error == null || error.trim().isEmpty()) {
            throw new AssertionError("Expected an error message but got empty text");
        }
    }

    @Test(priority = 6)
    public void unauthenticatedUserRedirectsToSplashOrLogin() {
        step("navigate to /today without login");
        page.navigate(baseUrl + "/today");
        page.waitForCondition(() -> {
            String url = page.url();
            return url.endsWith("/") || url.contains("/login") || url.contains("/today");
        });

        step("verify not on a protected page (redirected to splash or login)");
        String url = page.url();
        if (url.contains("/today")) {
            Locator sidebar = page.locator(".sidebar");
            if (sidebar.count() > 0 && sidebar.first().isVisible()) {
                throw new AssertionError("Should not be able to access /today without login");
            }
        }
    }

    private void assertElementExists(String cssSelector, String description) {
        if (page.locator(cssSelector).count() == 0) {
            throw new AssertionError("Expected " + description + " (" + cssSelector + ") to exist");
        }
    }
}
