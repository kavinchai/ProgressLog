package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.NavigationPage;
import com.kavin.fitness.e2e.support.BaseTest;
import org.openqa.selenium.By;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

/**
 * Verifies the logout flow: clicking Log out clears the session and prevents
 * authenticated routes from rendering (user is redirected away from /today).
 *
 * Important: this is the LAST class alphabetically among workout/today tests,
 * but TestNG class order isn't strictly guaranteed. Each test class brings up
 * its own driver and logs in fresh via BaseTest, so logging out here only
 * affects this class's driver.
 */
public class LogoutTest extends BaseTest {
    private NavigationPage nav;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        nav = new NavigationPage(driver);
        navigateToToday();
        nav.waitForSidebar();
    }

    @Test(priority = 1)
    public void logoutButtonIsVisibleInSidebar() {
        step("verify Log out button is visible");
        if (driver.findElements(By.cssSelector(".sidebar-logout")).isEmpty()) {
            throw new AssertionError("Expected '.sidebar-logout' button to exist");
        }
    }

    @Test(priority = 2, dependsOnMethods = "logoutButtonIsVisibleInSidebar")
    public void clickingLogoutRedirectsAwayFromTodayPage() {
        step("click Log out");
        nav.clickLogout();

        step("wait until /today is no longer accessible");
        wait.until(d -> {
            // After logout the unauthenticated routes take over: SplashPage,
            // Login, or Leaderboard (the unauthenticated landing). Sidebar is
            // not rendered for unauthenticated users.
            return d.findElements(By.cssSelector(".sidebar")).isEmpty();
        });

        step("verify sidebar is gone");
        if (!driver.findElements(By.cssSelector(".sidebar")).isEmpty()) {
            throw new AssertionError("Expected sidebar to be removed after logout");
        }
    }

    @Test(priority = 3, dependsOnMethods = "clickingLogoutRedirectsAwayFromTodayPage")
    public void directNavigationToTodayDoesNotRenderProtectedUI() {
        step("attempt to navigate to /today while logged out");
        driver.get(baseUrl + "/today");
        waitForPageLoad();

        step("verify the protected Today page UI does not render");
        // Unauthenticated routes don't mount the AppLayout, so .sidebar should
        // remain absent regardless of URL.
        wait.until(d -> d.findElements(By.cssSelector(".sidebar")).isEmpty());
        if (!driver.findElements(By.cssSelector(".sidebar")).isEmpty()) {
            throw new AssertionError("Expected sidebar to be absent on /today after logout");
        }
    }
}
