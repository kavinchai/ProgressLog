package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.ProgressPage;
import com.kavin.fitness.e2e.support.BaseTest;
import com.kavin.fitness.e2e.support.TestApiClient;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import java.time.LocalDate;

/**
 * Covers /progress (Strength only). Seeds workout sessions for a lift that
 * isn't featured, then adds it through the "Choose lifts" dialog so the page
 * shows its card, chart, session-history table and PR.
 *
 * Seeding throws on failure (see TestApiClient) so backend/auth issues
 * surface as actionable errors rather than missing-card assertions.
 */
public class ProgressPageTest extends BaseTest {
    private ProgressPage progress;
    private TestApiClient api;
    private final java.util.List<String> seededDates = new java.util.ArrayList<>();

    private static final String STRENGTH_NAME = "E2E Progress Lift";

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        progress = new ProgressPage(page);

        String apiUrl = System.getProperty("env.apiurl", "http://localhost:8080/api");
        String username = System.getProperty("test.user.username", "qaf-test");
        String password = System.getProperty("test.user.password", "qaf-test-password");

        api = new TestApiClient(apiUrl);
        api.login(username, password);

        // All three dates fall inside the default 3M range.
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

    @Test(priority = 1)
    public void strengthPageLoadsWithoutCardioTabs() {
        step("open /progress/strength");
        progress.openStrength(baseUrl);

        step("verify header rendered");
        if (!progress.isStrengthHeaderVisible()) {
            throw new AssertionError("Expected strength header");
        }

        step("verify the lift view rendered (seeded data exists, so no empty state)");
        if (!progress.isLiftViewVisible()) {
            throw new AssertionError("Expected the Choose lifts button");
        }

        step("verify the Strength / Cardio tabs are gone");
        if (progress.hasProgressTabs()) {
            throw new AssertionError("Did not expect Strength/Cardio tabs on /progress");
        }
    }

    @Test(priority = 2)
    public void cardioUrlRedirectsToStrength() {
        step("open the removed /progress/cardio URL");
        page.navigate(baseUrl + "/progress/cardio");

        step("verify it lands on /progress/strength");
        if (!progress.isStrengthHeaderVisible()) {
            throw new AssertionError("Expected strength header after redirect");
        }
        if (!"/progress/strength".equals(progress.currentPath())) {
            throw new AssertionError("Expected /progress/strength, got: " + progress.currentPath());
        }
    }

    @Test(priority = 3, dependsOnMethods = "strengthPageLoadsWithoutCardioTabs")
    public void chooseLiftsAddsSeededLiftCard() {
        step("open Choose lifts and search for the seeded lift");
        progress.openStrength(baseUrl);
        progress.openChooser();
        progress.searchChooser(STRENGTH_NAME);

        step("tick it and press Done");
        progress.chooseLift(STRENGTH_NAME);
        progress.confirmChooser();

        step("verify its card is on the page");
        if (!progress.isLiftCardVisible(STRENGTH_NAME)) {
            throw new AssertionError("Expected a card for '" + STRENGTH_NAME + "' — "
                    + "seeded data may not have been created (check TestApiClient errors)");
        }
    }

    @Test(priority = 4, dependsOnMethods = "chooseLiftsAddsSeededLiftCard")
    public void chosenLiftSurvivesReload() {
        step("reload the page");
        progress.reload();

        step("verify the chosen lift is still shown");
        if (!progress.isLiftCardVisible(STRENGTH_NAME)) {
            throw new AssertionError("Expected '" + STRENGTH_NAME + "' card after reload");
        }
    }

    @Test(priority = 5, dependsOnMethods = "chooseLiftsAddsSeededLiftCard")
    public void liftCardShowsSessionHistoryAndPR() {
        step("click the seeded lift's card");
        progress.clickLiftCard(STRENGTH_NAME);

        step("verify card becomes active");
        if (!progress.isLiftCardActive(STRENGTH_NAME)) {
            throw new AssertionError("Expected '" + STRENGTH_NAME + "' card to be active");
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

    @Test(priority = 6, dependsOnMethods = "liftCardShowsSessionHistoryAndPR")
    public void strengthRangeButtonsToggleActiveState() {
        step("verify 3M is the default range");
        if (!progress.isStrengthRangeActive("3M")) {
            throw new AssertionError("Expected 3M to be active by default");
        }

        step("click 4W range");
        progress.clickStrengthRange("4W");
        if (!progress.isStrengthRangeActive("4W")) {
            throw new AssertionError("Expected 4W to be active");
        }
        if (progress.isStrengthRangeActive("3M")) {
            throw new AssertionError("Did not expect '3M' to be active");
        }

        step("click All");
        progress.clickStrengthRange("All");
        if (!progress.isStrengthRangeActive("All")) {
            throw new AssertionError("Expected 'All' to be active after click");
        }
    }
}
