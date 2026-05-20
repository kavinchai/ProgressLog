package com.kavin.fitness.e2e.support;

import com.kavin.fitness.e2e.pages.LoginPage;
import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.options.LoadState;
import org.testng.Reporter;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public abstract class BaseTest {
    protected Playwright playwright;
    protected Browser browser;
    protected BrowserContext context;
    protected Page page;
    protected String baseUrl;

    @BeforeClass(alwaysRun = true)
    public void setUpDriverAndLogIn() {
        baseUrl = System.getProperty("env.baseurl", "http://localhost:5173");
        String apiUrl = System.getProperty("env.apiurl", "http://localhost:8080/api");
        String username = System.getProperty("test.user.username", "qaf-test");
        String password = System.getProperty("test.user.password", "qaf-test-password");

        ensureTestUserExists(apiUrl, username, password);

        playwright = Browsers.newPlaywright();
        browser = Browsers.chromium(playwright);
        context = browser.newContext(new Browser.NewContextOptions()
                .setViewportSize(1920, 1080));
        page = context.newPage();
        page.setDefaultTimeout(10_000);

        Reporter.log("Logging in as " + username, true);
        new LoginPage(page).open(baseUrl).login(username, password);
        page.waitForURL(url -> !url.contains("/login"));
        waitForPageLoad();
    }

    private void ensureTestUserExists(String apiUrl, String username, String password) {
        try {
            String body = "{\"username\":\"" + username + "\","
                    + "\"password\":\"" + password + "\","
                    + "\"email\":\"" + username + "@test.local\"}";
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl + "/auth/register"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            Reporter.log("Test user setup: HTTP " + response.statusCode()
                    + (response.statusCode() == 201 ? " (created)" : " (already exists)"), true);
        } catch (Exception e) {
            Reporter.log("Could not pre-register test user, will attempt login anyway: " + e.getMessage(), true);
        }
    }

    @AfterClass(alwaysRun = true)
    public void tearDown() {
        if (context != null) context.close();
        if (browser != null) browser.close();
        if (playwright != null) playwright.close();
    }

    protected void waitForPageLoad() {
        page.waitForLoadState(LoadState.NETWORKIDLE);
    }

    protected void navigateToToday() {
        page.navigate(baseUrl + "/");
        waitForPageLoad();
    }

    protected void step(String description) {
        System.out.println("  STEP: " + description);
        Reporter.log(description, false);
    }

    protected void waitForModalClosed() {
        page.locator(".modal-title").first().waitFor(
                new com.microsoft.playwright.Locator.WaitForOptions()
                        .setState(com.microsoft.playwright.options.WaitForSelectorState.HIDDEN));
    }
}
