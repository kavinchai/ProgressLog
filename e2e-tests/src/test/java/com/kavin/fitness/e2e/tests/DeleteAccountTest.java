package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.LoginPage;
import com.kavin.fitness.e2e.pages.SettingsPage;
import com.kavin.fitness.e2e.support.BaseTest;
import com.kavin.fitness.e2e.support.TestApiClient;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

/**
 * Deleting the account from Settings signs the user out and the credentials stop working.
 *
 * Runs as a throwaway user registered here, never the shared test user BaseTest logs in as.
 */
public class DeleteAccountTest extends BaseTest {
    private static final String PASSWORD = "delete-me-123";

    private final String username = "qaf-del-" + System.currentTimeMillis();
    private TestApiClient api;
    private SettingsPage settings;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void switchToThrowawayUser() {
        api = new TestApiClient(System.getProperty("env.apiurl", "http://localhost:8080/api"));
        int status = api.post("/auth/register", "{\"username\":\"" + username + "\","
                + "\"password\":\"" + PASSWORD + "\","
                + "\"email\":\"" + username + "@test.local\"}").statusCode();
        if (status != 201) {
            throw new IllegalStateException("Could not register throwaway user: HTTP " + status);
        }

        context.clearCookies();
        page.evaluate("() => localStorage.clear()");
        new LoginPage(page).open(baseUrl).login(username, PASSWORD);
        page.waitForURL(url -> !url.contains("/login"));
        waitForPageLoad();

        settings = new SettingsPage(page);
        settings.open(baseUrl);
    }

    @Test(priority = 1)
    public void deletingTheAccountSignsOut() {
        step("delete the account with the current password");
        settings.deleteAccount(PASSWORD);

        step("wait until the signed-in layout is gone");
        page.waitForCondition(() -> page.locator(".sidebar").count() == 0);
    }

    @Test(priority = 2, dependsOnMethods = "deletingTheAccountSignsOut")
    public void deletedCredentialsNoLongerLogIn() {
        step("log in with the deleted account's credentials via the API");
        // Fresh client: `api` still holds the register cookie, which would 401 for another reason.
        TestApiClient fresh = new TestApiClient(System.getProperty("env.apiurl", "http://localhost:8080/api"));
        int status = fresh.post("/auth/login",
                "{\"username\":\"" + username + "\",\"password\":\"" + PASSWORD + "\"}").statusCode();
        if (status != 401) {
            throw new AssertionError("Expected HTTP 401 for a deleted account but got: " + status);
        }
    }
}
