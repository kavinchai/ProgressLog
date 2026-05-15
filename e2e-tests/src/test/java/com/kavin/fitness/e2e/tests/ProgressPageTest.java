package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.ProgressPage;
import com.kavin.fitness.e2e.support.BaseTest;
import com.kavin.fitness.e2e.support.TestApiClient;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import java.time.LocalDate;
import java.util.List;

/**
 * Covers the /progress routes (Strength and Cardio tabs). Seeds workout
 * sessions with multiple weights across distinct dates so the page can
 * compute a PR and render the session-history table and chart.
 *
 * Seeding throws on failure (see TestApiClient) so backend/auth issues
 * surface as actionable errors rather than empty-sidebar assertions.
 */
public class ProgressPageTest extends BaseTest {
    private ProgressPage progress;
    private TestApiClient api;
    private final java.util.List<String> seededDates = new java.util.ArrayList<>();

    private static final String STRENGTH_NAME = "E2E Progress Lift";
    private static final String CARDIO_NAME = "Run";

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        progress = new ProgressPage(driver);

        String apiUrl = System.getProperty("env.apiurl", "http://localhost:8080/api");
        String username = System.getProperty("test.user.username", "qaf_test_user");
        String password = System.getProperty("test.user.password", "qaf_test_password");

        api = new TestApiClient(apiUrl);
        api.login(username, password);

        LocalDate now = LocalDate.now();
        String[] dates = {
                now.minusDays(60).toString(),
                now.minusDays(30).toString(),
                now.minusDays(7).toString(),
        };
        double[] weights = {135.0, 155.0, 175.0};
        for (int i = 0; i < dates.length; i++) {
            api.deleteWorkoutsOnDate(dates[i]);
            api.logLiftingWorkout(dates[i], "Progress E2E session",
                    STRENGTH_NAME, weights[i], 5);
            seededDates.add(dates[i]);
        }

        String runDate1 = now.minusDays(14).toString();
        String runDate2 = now.minusDays(3).toString();
        api.deleteWorkoutsOnDate(runDate1);
        api.deleteWorkoutsOnDate(runDate2);
        api.logRunWorkout(runDate1, 3.0, 1500);
        api.logRunWorkout(runDate2, 5.0, 2400);
        seededDates.add(runDate1);
        seededDates.add(runDate2);

        // Verify at least one strength session lands in the DB before driving
        // the UI — surfaces auth/API issues with a clear message.
        if (api.countWorkoutsOnDate(dates[2]) < 1) {
            throw new IllegalStateException(
                    "Expected seeded strength workout on " + dates[2] + " to exist; got 0");
        }

        navigateToToday();
    }

    @AfterClass(alwaysRun = true)
    public void cleanup() {
        try {
            if (api != null) {
                for (String date : seededDates) {
                    api.deleteWorkoutsOnDate(date);
                }
            }
        } catch (Exception ignored) {}
    }

    // ── Strength ─────────────────────────────────────────────────────────────

    @Test(priority = 1)
    public void strengthPageLoadsAndShowsTabsAndHeader() {
        step("open /progress/strength");
        progress.openStrength(baseUrl);

        step("verify both tabs visible");
        List<String> tabs = progress.getTabLabels();
        if (!tabs.contains("Strength") || !tabs.contains("Cardio")) {
            throw new AssertionError("Expected Strength/Cardio tabs, got: " + tabs);
        }
        if (!"Strength".equals(progress.getActiveTabLabel())) {
            throw new AssertionError("Expected Strength tab to be active");
        }

        step("verify header rendered");
        if (!progress.isStrengthHeaderVisible()) {
            throw new AssertionError("Expected strength header");
        }
    }

    @Test(priority = 2, dependsOnMethods = "strengthPageLoadsAndShowsTabsAndHeader")
    public void strengthSidebarListsSeededExercise() {
        step("verify sidebar visible with our seeded exercise");
        if (!progress.isStrengthSidebarVisible()) {
            throw new AssertionError("Expected strength sidebar visible — "
                    + "seeded data may not have been created (check TestApiClient errors)");
        }
        if (progress.getStrengthExerciseCount() == 0) {
            throw new AssertionError("Expected at least 1 strength exercise in sidebar");
        }
    }

    @Test(priority = 3, dependsOnMethods = "strengthSidebarListsSeededExercise")
    public void strengthShowsSessionHistoryAndPR() {
        step("click our seeded exercise");
        progress.clickStrengthExercise(STRENGTH_NAME);

        step("verify exercise becomes active");
        if (!progress.isStrengthExerciseActive(STRENGTH_NAME)) {
            throw new AssertionError("Expected '" + STRENGTH_NAME + "' to be active");
        }

        step("verify session history table renders");
        if (!progress.isSessionTableVisible()) {
            throw new AssertionError("Expected session history table");
        }
        if (progress.getSessionRowCount() < 3) {
            throw new AssertionError("Expected 3 sessions, got: " + progress.getSessionRowCount());
        }

        step("verify a PR row + badge are rendered (latest session was heaviest)");
        if (!progress.hasPRRow()) {
            throw new AssertionError("Expected one row to be marked as a PR");
        }
        if (!progress.hasPRBadge()) {
            throw new AssertionError("Expected a 'PR' badge to be visible");
        }

        step("verify current max reflects 175 lbs (the latest seeded session)");
        String currentMax = progress.getCurrentMaxValue();
        if (!currentMax.contains("175")) {
            throw new AssertionError("Expected current max to contain '175', got: " + currentMax);
        }
    }

    @Test(priority = 4, dependsOnMethods = "strengthShowsSessionHistoryAndPR")
    public void strengthRangeButtonsToggleActiveState() {
        step("click 4W range");
        progress.clickStrengthRange("4W");

        step("verify 4W is active and others are not");
        if (!progress.isStrengthRangeActive("4W")) {
            throw new AssertionError("Expected 4W to be active");
        }
        if (progress.isStrengthRangeActive("All")) {
            throw new AssertionError("Did not expect 'All' to be active");
        }

        step("click All to restore");
        progress.clickStrengthRange("All");
        if (!progress.isStrengthRangeActive("All")) {
            throw new AssertionError("Expected 'All' to be active after click");
        }
    }

    // ── Cardio ───────────────────────────────────────────────────────────────

    @Test(priority = 5)
    public void cardioPageLoadsAndShowsSeededRuns() {
        step("open /progress/cardio via tab click");
        progress.openStrength(baseUrl);
        progress.clickTab("Cardio");

        step("verify Cardio tab is active");
        if (!"Cardio".equals(progress.getActiveTabLabel())) {
            throw new AssertionError("Expected Cardio tab active");
        }

        step("verify cardio header rendered");
        if (!progress.isCardioHeaderVisible()) {
            throw new AssertionError("Expected cardio header");
        }

        step("verify cardio sidebar lists Run");
        if (!progress.isCardioSidebarVisible()) {
            throw new AssertionError("Expected cardio sidebar visible — "
                    + "seeded run data may not have been created (check TestApiClient errors)");
        }
        if (progress.getCardioExerciseCount() == 0) {
            throw new AssertionError("Expected at least 1 cardio exercise in sidebar");
        }
    }

    @Test(priority = 6, dependsOnMethods = "cardioPageLoadsAndShowsSeededRuns")
    public void cardioRunIsSelectable() {
        step("click 'Run' in sidebar");
        progress.clickCardioExercise(CARDIO_NAME);
    }
}
