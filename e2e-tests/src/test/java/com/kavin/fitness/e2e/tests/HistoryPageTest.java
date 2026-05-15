package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.HistoryPage;
import com.kavin.fitness.e2e.support.BaseTest;
import com.kavin.fitness.e2e.support.TestApiClient;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import java.time.LocalDate;
import java.util.List;

/**
 * Covers the /history routes (Weekly and Total tabs). These pages had zero
 * E2E coverage. Seeds known data via the API before driving the UI so the
 * page shows something to assert against — otherwise a freshly created test
 * user shows only empty states.
 *
 * Seeding fails loudly (see TestApiClient) so a backend issue produces an
 * actionable error rather than a misleading "X not visible" assertion.
 *
 * @AfterClass deletes the seeded today workout so later workout test classes
 * (which expect to start from a clean Today page) aren't polluted.
 */
public class HistoryPageTest extends BaseTest {
    private HistoryPage history;
    private TestApiClient api;
    private String todayDate;
    private String pastDate;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        history = new HistoryPage(driver);

        LocalDate now = LocalDate.now();
        todayDate = now.toString();
        pastDate = now.minusDays(40).toString();

        String apiUrl = System.getProperty("env.apiurl", "http://localhost:8080/api");
        String username = System.getProperty("test.user.username", "qaf_test_user");
        String password = System.getProperty("test.user.password", "qaf_test_password");

        api = new TestApiClient(apiUrl);
        api.login(username, password);

        api.deleteWorkoutsOnDate(todayDate);
        api.deleteWorkoutsOnDate(pastDate);

        api.logWeight(todayDate, 180.0);
        api.logSteps(todayDate, 8500);
        api.logLiftingWorkout(todayDate, "History E2E Today",
                "History E2E Bench", 135.0, 8);
        api.logLiftingWorkout(pastDate, "History E2E Past",
                "History E2E Squat", 200.0, 5);
        api.logWeight(pastDate, 182.5);

        // Verify the workouts actually exist before driving the UI. If this
        // fails the issue is with the API/auth, not with the page rendering.
        int todayCount = api.countWorkoutsOnDate(todayDate);
        if (todayCount < 1) {
            throw new IllegalStateException(
                    "Expected seeded today workout to exist; countWorkoutsOnDate(" + todayDate
                            + ") = " + todayCount);
        }

        navigateToToday();
    }

    @AfterClass(alwaysRun = true)
    public void cleanup() {
        // Best-effort: clean up the seeded today workout so the next test
        // class sees an empty Today page. Don't fail teardown on errors.
        try {
            if (api != null) {
                api.deleteWorkoutsOnDate(todayDate);
                api.deleteWorkoutsOnDate(pastDate);
            }
        } catch (Exception ignored) {}
    }

    // ── Weekly ───────────────────────────────────────────────────────────────

    @Test(priority = 1)
    public void weeklyPageLoadsWithTitleAndTabs() {
        step("open /history/weekly");
        history.openWeekly(baseUrl);

        step("verify tabs 'Weekly' and 'Total' present, 'Weekly' active");
        List<String> tabs = history.getTabLabels();
        if (!tabs.contains("Weekly") || !tabs.contains("Total")) {
            throw new AssertionError("Expected Weekly/Total tabs, got: " + tabs);
        }
        if (!"Weekly".equals(history.getActiveTabLabel())) {
            throw new AssertionError("Expected Weekly tab active");
        }
    }

    @Test(priority = 2, dependsOnMethods = "weeklyPageLoadsWithTitleAndTabs")
    public void weeklyShowsDailyLogTableForCurrentWeek() {
        step("verify Daily Log table has 7 rows (one per day of week)");
        if (!history.isWeeklyTableVisible()) {
            throw new AssertionError("Expected weekly table to be visible");
        }
        int rows = history.getWeeklyRowCount();
        if (rows != 7) {
            throw new AssertionError("Expected 7 weekly rows, got: " + rows);
        }
    }

    @Test(priority = 3, dependsOnMethods = "weeklyShowsDailyLogTableForCurrentWeek")
    public void weeklyHighlightsTodayRow() {
        step("verify today's row is highlighted");
        if (!history.hasTodayRow()) {
            throw new AssertionError("Expected today's row to be highlighted with .today-row");
        }
    }

    @Test(priority = 4, dependsOnMethods = "weeklyShowsDailyLogTableForCurrentWeek")
    public void weeklyRowExpandsToShowDayDetail() {
        step("click first weekly row");
        history.clickFirstWeeklyRow();

        step("verify detail row appears");
        if (!history.isExpandedRowVisible()) {
            throw new AssertionError("Expected detail row to appear after click");
        }

        step("verify day-detail contains a Weight section label");
        if (!history.dayDetailContains("Weight")) {
            throw new AssertionError("Expected expanded day detail to show 'Weight' label");
        }
    }

    // ── Total ────────────────────────────────────────────────────────────────

    @Test(priority = 5)
    public void totalPageLoadsAndShowsCalendar() {
        step("open /history/total");
        history.openTotal(baseUrl);

        step("verify 'Total' tab is active");
        if (!"Total".equals(history.getActiveTabLabel())) {
            throw new AssertionError("Expected Total tab to be active");
        }

        step("verify calendar grid is visible");
        if (!history.isCalendarVisible()) {
            throw new AssertionError("Expected calendar grid to be visible");
        }

        step("verify month navigation is visible (we have seeded data)");
        if (!history.isMonthNavVisible()) {
            throw new AssertionError("Expected month navigation to render when data exists");
        }
    }

    @Test(priority = 6, dependsOnMethods = "totalPageLoadsAndShowsCalendar")
    public void totalCalendarHasCellsForCurrentMonth() {
        step("verify calendar has at least 28 day cells");
        int cells = history.getCalendarCellCount();
        if (cells < 28) {
            throw new AssertionError("Expected at least 28 calendar cells, got: " + cells);
        }
    }

    @Test(priority = 7, dependsOnMethods = "totalCalendarHasCellsForCurrentMonth")
    public void clickingTodayInCalendarOpensDayModal() {
        step("click today's cell in calendar");
        history.clickCalendarDay(todayDate);

        step("verify day modal opens");
        history.waitForDayModal();
        if (!history.dayModalContains("Weight")) {
            throw new AssertionError("Expected day modal to show 'Weight' label");
        }

        step("close modal");
        history.closeDayModal();
    }

    @Test(priority = 8, dependsOnMethods = "totalPageLoadsAndShowsCalendar")
    public void totalRangeButtonsToggleActiveState() {
        // Range buttons live inside the Weight Trend section which only
        // renders when weight data exists. We seeded weight for two dates, so
        // re-open the page to ensure latest state is rendered.
        step("re-open /history/total to ensure freshest render");
        history.openTotal(baseUrl);

        step("verify all range buttons present");
        for (String label : new String[]{"30d", "90d", "1yr", "all"}) {
            if (!history.isRangeButtonVisible(label)) {
                throw new AssertionError("Expected range button '" + label + "' to be visible — "
                        + "weight data may not be seeded (check earlier TestApiClient errors)");
            }
        }

        step("click 30d range and verify it becomes active");
        history.clickRangeButton("30d");
        if (!history.isRangeButtonActive("30d")) {
            throw new AssertionError("Expected '30d' to be active after click");
        }
        if (history.isRangeButtonActive("90d")) {
            throw new AssertionError("Did not expect '90d' to be active after clicking '30d'");
        }
    }

    @Test(priority = 9, dependsOnMethods = "totalPageLoadsAndShowsCalendar")
    public void monthPickerOpensWhenLabelClicked() {
        step("click month label to open picker");
        history.clickMonthPickerToggle();

        step("verify month picker is shown");
        if (!history.isMonthPickerVisible()) {
            throw new AssertionError("Expected month picker to be visible after click");
        }
    }
}
