package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.LeaderboardPage;
import com.kavin.fitness.e2e.pages.NavigationPage;
import com.kavin.fitness.e2e.pages.SettingsPage;
import com.kavin.fitness.e2e.support.BaseTest;
import com.kavin.fitness.e2e.support.TestApiClient;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import java.time.LocalDate;

/**
 * Verifies the leaderboard privacy contract end-to-end:
 *
 * 1. By default (shareData=false) a user's data does NOT appear on the leaderboard.
 * 2. After toggling shareData ON via the Settings UI, the user's data DOES appear.
 * 3. After toggling shareData back OFF, the user's data is removed.
 * 4. Same flow using sidebar navigation (client-side routing, no full page reload).
 *
 * This reproduces the reported bug where unticking "Share Data on Leaderboard"
 * did not remove a user's data from the leaderboard once it had been shared.
 */
public class LeaderboardPrivacyTest extends BaseTest {
    private LeaderboardPage leaderboard;
    private SettingsPage settings;
    private NavigationPage nav;
    private TestApiClient apiClient;
    private String testUsername;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        testUsername = System.getProperty("test.user.username", "qaf-test");
        String apiUrl = System.getProperty("env.apiurl", "http://localhost:8080/api");
        String password = System.getProperty("test.user.password", "qaf-test-password");

        leaderboard = new LeaderboardPage(page);
        settings = new SettingsPage(page);
        nav = new NavigationPage(page);

        apiClient = new TestApiClient(apiUrl);
        apiClient.login(testUsername, password);

        // Seed a workout so the user has data that could appear on the leaderboard
        String today = LocalDate.now().toString();
        apiClient.logLiftingWorkout(today, "Privacy Test", "Bench Press", 185, 5);

        // Ensure shareData starts as false
        apiClient.setShareData(false);
    }

    @Test(priority = 1)
    public void leaderboardDoesNotShowUserByDefault() {
        step("navigate to leaderboard with shareData=false");
        leaderboard.open(baseUrl);

        step("verify test user is NOT on the leaderboard");
        boolean onBoard = leaderboard.isUsernameOnBoard(testUsername);
        if (onBoard) {
            throw new AssertionError("Expected user '" + testUsername
                    + "' NOT to appear on leaderboard when shareData is false");
        }
    }

    @Test(priority = 2, dependsOnMethods = "leaderboardDoesNotShowUserByDefault")
    public void enableShareDataShowsUserOnLeaderboard() {
        step("navigate to Settings and toggle share data ON");
        settings.open(baseUrl);
        settings.waitForShareDataState("Off");
        settings.clickShareDataToggle();
        settings.waitForShareDataState("On");
        settings.waitForPrivacySaveComplete();

        step("navigate to leaderboard and verify user IS on the board");
        leaderboard.open(baseUrl);

        boolean onBoard = leaderboard.isUsernameOnBoard(testUsername);
        if (!onBoard) {
            throw new AssertionError("Expected user '" + testUsername
                    + "' to appear on leaderboard after enabling shareData");
        }
    }

    @Test(priority = 3, dependsOnMethods = "enableShareDataShowsUserOnLeaderboard")
    public void disableShareDataRemovesUserFromLeaderboard() {
        step("navigate to Settings and toggle share data OFF");
        settings.open(baseUrl);
        settings.waitForShareDataState("On");
        settings.clickShareDataToggle();
        settings.waitForShareDataState("Off");
        settings.waitForPrivacySaveComplete();

        step("navigate to leaderboard and verify user is NO LONGER on the board");
        leaderboard.open(baseUrl);

        boolean onBoard = leaderboard.isUsernameOnBoard(testUsername);
        if (onBoard) {
            throw new AssertionError("Expected user '" + testUsername
                    + "' NOT to appear on leaderboard after disabling shareData, "
                    + "but they were still visible (reported privacy bug)");
        }
    }

    @Test(priority = 4, dependsOnMethods = "disableShareDataRemovesUserFromLeaderboard")
    public void sidebarNavigationToggleOnThenOffRemovesUser() {
        step("ensure shareData starts OFF, then toggle ON via Settings");
        apiClient.setShareData(false);
        settings.open(baseUrl);
        settings.waitForShareDataState("Off");
        settings.clickShareDataToggle();
        settings.waitForShareDataState("On");
        settings.waitForPrivacySaveComplete();

        step("use sidebar to navigate to Community (client-side routing)");
        nav.clickSidebarLink("Community");
        nav.waitForUrlContains("/community");
        waitForPageLoad();

        boolean onBoardAfterOn = leaderboard.isUsernameOnBoard(testUsername);
        if (!onBoardAfterOn) {
            throw new AssertionError("Expected user on leaderboard after enabling shareData via sidebar nav");
        }

        step("use sidebar to navigate to Settings and toggle OFF");
        nav.clickSidebarLink("Settings");
        nav.waitForUrlContains("/settings");
        waitForPageLoad();

        settings.waitForShareDataState("On");
        settings.clickShareDataToggle();
        settings.waitForShareDataState("Off");
        settings.waitForPrivacySaveComplete();

        step("use sidebar to navigate back to Community");
        nav.clickSidebarLink("Community");
        nav.waitForUrlContains("/community");
        waitForPageLoad();

        boolean onBoardAfterOff = leaderboard.isUsernameOnBoard(testUsername);
        if (onBoardAfterOff) {
            throw new AssertionError("Expected user '" + testUsername
                    + "' NOT on leaderboard after toggling OFF via sidebar navigation, "
                    + "but they were still visible (reported privacy bug)");
        }

        step("cleanup: ensure share data is off");
        apiClient.setShareData(false);
    }
}
