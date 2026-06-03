package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.HistoryPage;
import com.kavin.fitness.e2e.pages.WorkoutBuilderModal;
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
        history = new HistoryPage(page);

        LocalDate now = LocalDate.now();
        todayDate = now.toString();
        pastDate = now.minusDays(40).toString();

        String apiUrl = System.getProperty("env.apiurl", "http://localhost:8080/api");
        String username = System.getProperty("test.user.username", "qaf-test");
        String password = System.getProperty("test.user.password", "qaf-test-password");

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
        // Best-effort: clean up everything we seeded so the next test class
        // sees an empty Today page. Leftover weight/steps bleed into the Today
        // UI (e.g. WeightTest can't find "+ Add", WorkoutTimedTest's page-wide
        // text check matches "180 lbs" via the "0 lbs" substring).
        try {
            if (api != null) {
                api.deleteWorkoutsOnDate(todayDate);
                api.deleteWorkoutsOnDate(pastDate);
                api.deleteWeightOnDate(todayDate);
                api.deleteWeightOnDate(pastDate);
                api.deleteStepsOnDate(todayDate);
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

    @Test(priority = 10, dependsOnMethods = "weeklyShowsDailyLogTableForCurrentWeek")
    public void weeklyAddExerciseAppendsToExistingSession() {
        step("open /history/weekly");
        history.openWeekly(baseUrl);

        step("expand today's row (has a single seeded workout session)");
        history.clickTodayRow();
        if (!history.isExpandedRowVisible()) {
            throw new AssertionError("Expected today's detail row to expand");
        }

        step("click the workout '+ Add exercise' button in the expanded day");
        history.clickAddExerciseInExpandedDay();

        step("verify it opens the existing session for editing, not a brand-new workout");
        WorkoutBuilderModal modal = new WorkoutBuilderModal(page).waitUntilVisible();
        if (!modal.title().contains("Edit Workout")) {
            throw new AssertionError(
                    "Expected '+ Add exercise' to append to the existing session (Edit Workout), "
                            + "but the modal title was: " + modal.title());
        }

        step("verify the existing exercise is pre-filled and a blank row was appended");
        modal.waitForExerciseCount(2);
        if (!"History E2E Bench".equals(modal.exerciseNameValue(0))) {
            throw new AssertionError(
                    "Expected existing exercise to be pre-filled, got: " + modal.exerciseNameValue(0));
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
