package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.NavigationPage;
import com.kavin.fitness.e2e.support.BaseTest;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

/**
 * Verifies the logout flow: clicking Log out clears the session and prevents
 * authenticated routes from rendering (user is redirected away from /today).
 *
 * Each test class brings up its own browser and logs in fresh via BaseTest,
 * so logging out here only affects this class's session.
 */
public class LogoutTest extends BaseTest {
    private NavigationPage nav;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        nav = new NavigationPage(page);
        navigateToToday();
        nav.waitForSidebar();
    }

    @Test(priority = 1)
    public void logoutButtonIsVisibleInSidebar() {
        step("verify Log out button is visible");
        if (page.locator(".sidebar-logout").count() == 0) {
            throw new AssertionError("Expected '.sidebar-logout' button to exist");
        }
    }

    @Test(priority = 2, dependsOnMethods = "logoutButtonIsVisibleInSidebar")
    public void clickingLogoutRedirectsAwayFromTodayPage() {
        step("click Log out");
        nav.clickLogout();

        step("wait until /today is no longer accessible");
        // After logout the unauthenticated routes take over (Splash, Login,
        // or unauthenticated Leaderboard). The sidebar is not rendered for
        // unauthenticated users.
        page.waitForCondition(() -> page.locator(".sidebar").count() == 0);

        step("verify sidebar is gone");
        if (page.locator(".sidebar").count() > 0) {
            throw new AssertionError("Expected sidebar to be removed after logout");
        }
    }

    @Test(priority = 3, dependsOnMethods = "clickingLogoutRedirectsAwayFromTodayPage")
    public void directNavigationToTodayDoesNotRenderProtectedUI() {
        step("attempt to navigate to /today while logged out");
        page.navigate(baseUrl + "/today");
        waitForPageLoad();

        step("verify the protected Today page UI does not render");
        // Unauthenticated routes don't mount the AppLayout, so .sidebar should
        // remain absent regardless of URL.
        page.waitForCondition(() -> page.locator(".sidebar").count() == 0);
        if (page.locator(".sidebar").count() > 0) {
            throw new AssertionError("Expected sidebar to be absent on /today after logout");
        }
    }
}
