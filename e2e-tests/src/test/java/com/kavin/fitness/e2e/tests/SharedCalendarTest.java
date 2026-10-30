package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.SettingsPage;
import com.kavin.fitness.e2e.pages.SharedCalendarPage;
import com.kavin.fitness.e2e.support.BaseTest;
import com.kavin.fitness.e2e.support.TestApiClient;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import java.time.LocalDate;

/**
 * Verifies the shared-calendar opt-in contract end-to-end:
 *
 *   1. With shareCalendar=false, the user's workout does NOT appear on the
 *      Shared Calendar tab of the leaderboard.
 *   2. Toggling "Share on Community Calendar" ON in Settings makes the user's
 *      workout appear on the Shared Calendar.
 *   3. Toggling OFF removes them again.
 */
public class SharedCalendarTest extends BaseTest {
    private SharedCalendarPage calendar;
    private SettingsPage       settings;
    private TestApiClient      apiClient;
    private String             testUsername;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        testUsername = System.getProperty("test.user.username", "qaf-test");
        String apiUrl = System.getProperty("env.apiurl", "http://localhost:8080/api");
        String password = System.getProperty("test.user.password", "qaf-test-password");

        calendar = new SharedCalendarPage(page);
        settings = new SettingsPage(page);

        apiClient = new TestApiClient(apiUrl);
        apiClient.login(testUsername, password);

        // Seed a workout the calendar could surface
        String today = LocalDate.now().toString();
        apiClient.logLiftingWorkout(today, "Shared Calendar Test", "Overhead Press", 95, 5);

        // Ensure shareCalendar starts as false
        apiClient.setShareCalendar(false);
    }

    @Test(priority = 1)
    public void sharedCalendarHasSubnavTab() {
        step("open leaderboard and verify the Leaderboard / Calendar view switch exists");
        calendar.open(baseUrl);
        if (!calendar.hasSubnav()) {
            throw new AssertionError("Expected Leaderboard / Calendar view switch buttons");
        }
    }

    @Test(priority = 2, dependsOnMethods = "sharedCalendarHasSubnavTab")
    public void calendarHidesUserByDefault() {
        step("switch to Shared Calendar with shareCalendar=false");
        calendar.open(baseUrl);
        calendar.clickSharedCalendarTab();
        if (!calendar.awaitCalendarVisible()) {
            throw new AssertionError("Shared Calendar view never rendered");
        }
        if (!calendar.isUsernameAbsentFromCalendar(testUsername)) {
            throw new AssertionError("Expected user '" + testUsername
                    + "' NOT on shared calendar when shareCalendar=false");
        }
    }

    @Test(priority = 3, dependsOnMethods = "calendarHidesUserByDefault")
    public void enablingToggleShowsUserOnCalendar() {
        step("toggle Share on Community Calendar ON via Settings");
        settings.open(baseUrl);
        settings.waitForShareCalendarState("Off");
        settings.clickShareCalendarToggle();
        settings.waitForShareCalendarState("On");
        settings.waitForPrivacySaveComplete();

        step("navigate to leaderboard and switch to Shared Calendar");
        calendar.open(baseUrl);
        calendar.clickSharedCalendarTab();
        calendar.awaitCalendarVisible();

        if (!calendar.isUsernameOnCalendar(testUsername)) {
            throw new AssertionError("Expected user '" + testUsername
                    + "' on shared calendar after enabling shareCalendar");
        }

        step("verify session name appears in today's day panel");
        if (!calendar.isSessionNameOnCalendar("Shared Calendar Test")) {
            throw new AssertionError("Expected session name 'Shared Calendar Test' to appear on the calendar");
        }

        step("open the user's row and verify the seeded set is listed");
        calendar.expandRow(testUsername);
        if (!calendar.isSetLineVisible("5 reps @ 95 lbs")) {
            throw new AssertionError("Expected the seeded Overhead Press set '5 reps @ 95 lbs' in the open row");
        }
    }

    @Test(priority = 4, dependsOnMethods = "enablingToggleShowsUserOnCalendar")
    public void weekAndMonthViewsBothShowUser() {
        step("with shareCalendar already ON, verify default month view shows user");
        calendar.open(baseUrl);
        calendar.clickSharedCalendarTab();
        calendar.awaitCalendarVisible();
        if (!calendar.isUsernameOnCalendar(testUsername)) {
            throw new AssertionError("Expected user on default (month) view");
        }

        step("switch to week view and verify user still visible");
        calendar.clickWeekView();
        calendar.awaitCalendarVisible();
        if (!calendar.isUsernameOnCalendar(testUsername)) {
            throw new AssertionError("Expected user on week view");
        }

        step("switch back to month view");
        calendar.clickMonthView();
        calendar.awaitCalendarVisible();
        if (!calendar.isUsernameOnCalendar(testUsername)) {
            throw new AssertionError("Expected user on month view after switching back");
        }
    }

    @Test(priority = 5, dependsOnMethods = "weekAndMonthViewsBothShowUser")
    public void disablingToggleRemovesUserFromCalendar() {
        step("toggle Share on Community Calendar OFF via Settings");
        settings.open(baseUrl);
        settings.waitForShareCalendarState("On");
        settings.clickShareCalendarToggle();
        settings.waitForShareCalendarState("Off");
        settings.waitForPrivacySaveComplete();

        step("navigate to leaderboard and switch to Shared Calendar");
        calendar.open(baseUrl);
        calendar.clickSharedCalendarTab();
        calendar.awaitCalendarVisible();

        if (!calendar.isUsernameAbsentFromCalendar(testUsername)) {
            throw new AssertionError("Expected user '" + testUsername
                    + "' NOT on shared calendar after disabling shareCalendar");
        }

        step("cleanup");
        apiClient.setShareCalendar(false);
    }
}
