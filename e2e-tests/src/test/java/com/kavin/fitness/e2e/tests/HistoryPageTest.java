package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.HistoryPage;
import com.kavin.fitness.e2e.pages.WorkoutBuilderModal;
import com.kavin.fitness.e2e.support.BaseTest;
import com.kavin.fitness.e2e.support.TestApiClient;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;

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

    /** Matches the app's shortDate(): "Wed 10/28". */
    private static String shortDate(LocalDate d) {
        return d.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.US)
                + " " + d.getMonthValue() + "/" + d.getDayOfMonth();
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
    public void weeklyShowsOneCardPerDayOfTheWeek() {
        step("verify the week strip has 7 day cards");
        if (!history.isWeekStripVisible()) {
            throw new AssertionError("Expected the week strip to be visible");
        }
        int cards = history.getDayCardCount();
        if (cards != 7) {
            throw new AssertionError("Expected 7 day cards, got: " + cards);
        }
    }

    @Test(priority = 3, dependsOnMethods = "weeklyShowsOneCardPerDayOfTheWeek")
    public void weeklySelectsTodayByDefault() {
        step("verify today's card is selected and its day panel is shown");
        if (!history.isTodaySelected()) {
            throw new AssertionError("Expected today's card to be selected by default");
        }
        history.waitForDayPanelTitle(shortDate(LocalDate.now()));

        step("verify the panel shows today's seeded workout");
        if (!history.dayPanelContains("History E2E Bench")) {
            throw new AssertionError("Expected today's panel to show the seeded 'History E2E Bench'");
        }
    }

    @Test(priority = 4, dependsOnMethods = "weeklyShowsOneCardPerDayOfTheWeek")
    public void selectingADayShowsItInTheDayPanel() {
        step("click the first (Sunday) card");
        history.clickFirstDayCard();

        step("verify the day panel switched to Sunday");
        LocalDate now = LocalDate.now();
        history.waitForDayPanelTitle(shortDate(now.minusDays(now.getDayOfWeek().getValue() % 7)));
    }

    @Test(priority = 5, dependsOnMethods = "weeklyShowsOneCardPerDayOfTheWeek")
    public void weeklyShowsCaloriesAndStepsCharts() {
        step("verify the daily charts render below the day panel");
        if (!history.isChartVisible("Calories per day")) {
            throw new AssertionError("Expected 'Calories per day' chart");
        }
        if (!history.isChartVisible("Steps per day")) {
            throw new AssertionError("Expected 'Steps per day' chart");
        }
    }

    @Test(priority = 6, dependsOnMethods = "weeklyShowsOneCardPerDayOfTheWeek")
    public void weeklyNavigatesToPreviousWeekAndBack() {
        step("on the current week Next is disabled");
        history.waitForThisWeekPill();
        history.waitForNextWeekEnabled(false);

        step("go back one week: Next becomes enabled and the 'This week' pill goes away");
        history.clickPreviousWeek();
        history.waitForNextWeekEnabled(true);
        history.waitForThisWeekPillHidden();

        step("come back to the current week");
        history.clickNextWeek();
        history.waitForThisWeekPill();
        history.waitForNextWeekEnabled(false);
    }

    @Test(priority = 12, dependsOnMethods = "weeklyShowsOneCardPerDayOfTheWeek")
    public void weeklyAddExerciseAppendsToExistingSession() {
        step("open /history/weekly");
        history.openWeekly(baseUrl);

        step("select today's card (has a single seeded workout session)");
        history.clickTodayCard();
        if (!history.dayPanelContains("History E2E Bench")) {
            throw new AssertionError("Expected today's day panel to show the seeded workout");
        }

        step("click the workout '+ Add exercise' button in the day panel");
        history.clickAddExerciseInDayPanel();

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

    @Test(priority = 7)
    public void totalPageLoadsAndShowsCalendar() {
        step("open /history/total");
        history.openTotal(baseUrl);

        step("verify 'Total' tab is active");
        if (!"Total".equals(history.getActiveTabLabel())) {
            throw new AssertionError("Expected Total tab to be active");
        }

        step("verify the heatmap calendar is visible");
        if (!history.isCalendarVisible()) {
            throw new AssertionError("Expected heatmap calendar to be visible");
        }

        step("verify month navigation is visible (we have seeded data)");
        if (!history.isMonthNavVisible()) {
            throw new AssertionError("Expected month navigation to render when data exists");
        }
    }

    @Test(priority = 8, dependsOnMethods = "totalPageLoadsAndShowsCalendar")
    public void totalCalendarHasCellsForCurrentMonth() {
        step("verify calendar has at least 28 day cells");
        int cells = history.getCalendarCellCount();
        if (cells < 28) {
            throw new AssertionError("Expected at least 28 calendar cells, got: " + cells);
        }
    }

    @Test(priority = 9, dependsOnMethods = "totalCalendarHasCellsForCurrentMonth")
    public void clickingTodayShowsItInTheDayPanel() {
        step("click today's cell in calendar");
        history.clickCalendarDay(todayDate);

        step("verify the side panel shows today with its seeded workout");
        history.waitForDayPanelTitle(shortDate(LocalDate.now()));
        if (!history.dayPanelContains("History E2E Bench")) {
            throw new AssertionError("Expected the day panel to show the seeded 'History E2E Bench'");
        }

        step("close the day panel");
        history.closeDayPanel();
    }

    @Test(priority = 10, dependsOnMethods = "totalCalendarHasCellsForCurrentMonth")
    public void heatmapMetricSwitchRelabelsDays() {
        step("color days by Steps");
        history.selectHeatmapMetric("Steps");

        step("today's cell reports the seeded 8,500 steps");
        history.waitForCalendarDayLabel(todayDate, "Steps 8,500");
    }

    @Test(priority = 11, dependsOnMethods = "totalPageLoadsAndShowsCalendar")
    public void trendChartsRender() {
        step("verify weight trend, avg calories per week and workout consistency render");
        for (String title : List.of("Weight trend", "Avg calories per week", "Workout consistency")) {
            if (!history.isChartVisible(title)) {
                throw new AssertionError("Expected '" + title + "' chart on the Total page");
            }
        }
    }

    @Test(priority = 13, dependsOnMethods = "totalPageLoadsAndShowsCalendar")
    public void monthPickerOpensWhenLabelClicked() {
        step("open /history/total");
        history.openTotal(baseUrl);

        step("click month label to open picker");
        history.clickMonthPickerToggle();

        step("verify month picker is shown");
        if (!history.isMonthPickerVisible()) {
            throw new AssertionError("Expected month picker to be visible after click");
        }
    }
}
