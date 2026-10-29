package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.LeaderboardPage;
import com.kavin.fitness.e2e.support.BaseTest;
import com.kavin.fitness.e2e.support.TestApiClient;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import java.time.LocalDate;

/**
 * Community "Choose lifts": the board starts on the featured lifts, and a
 * signed-in user can add any other lift with a board this month.
 *
 * Seeds a set of a non-featured lift for the test user (on the 1st of the
 * month, so it's on This month's board) and shares it.
 */
public class LeaderboardChooseLiftsTest extends BaseTest {
    private static final String LIFT = "E2E Choose Lift";
    private static final String SESSION = "Choose Lifts Test";

    private LeaderboardPage leaderboard;
    private TestApiClient apiClient;
    private String seedDate;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        String username = System.getProperty("test.user.username", "qaf-test");
        String password = System.getProperty("test.user.password", "qaf-test-password");
        String apiUrl = System.getProperty("env.apiurl", "http://localhost:8080/api");

        leaderboard = new LeaderboardPage(page);
        apiClient = new TestApiClient(apiUrl);
        apiClient.login(username, password);

        // The 1st keeps the set on This month's board. (The browser and server
        // clocks can disagree for a few minutes around midnight on the 1st.)
        seedDate = LocalDate.now().withDayOfMonth(1).toString();
        apiClient.deleteWorkoutsOnDate(seedDate, SESSION); // leftovers from an aborted run
        apiClient.logLiftingWorkout(seedDate, SESSION, LIFT, 95, 5);
        apiClient.setShareData(true);
    }

    @AfterClass(alwaysRun = true)
    public void cleanup() {
        try {
            if (apiClient != null) {
                apiClient.setShareData(false);
                apiClient.deleteWorkoutsOnDate(seedDate, SESSION);
            }
        } catch (Exception ignored) {}
    }

    @Test(priority = 1)
    public void nonFeaturedLiftIsNotShownByDefault() {
        step("open the leaderboard");
        leaderboard.open(baseUrl);

        step("verify the seeded non-featured lift is not one of the lift choices");
        if (leaderboard.hasLiftChip(LIFT)) {
            throw new AssertionError("Expected '" + LIFT + "' to be hidden until chosen");
        }

        step("verify it has a board: it's listed, unticked, in Choose lifts");
        leaderboard.openChooser();
        if (!leaderboard.awaitLiftInChooser(LIFT)) {
            throw new AssertionError("Expected '" + LIFT + "' in Choose lifts (seeded and shared)");
        }
        if (leaderboard.isLiftTickedInChooser(LIFT)) {
            throw new AssertionError("Expected '" + LIFT + "' to start unticked");
        }
        leaderboard.cancelChooser();
    }

    @Test(priority = 2, dependsOnMethods = "nonFeaturedLiftIsNotShownByDefault")
    public void chooseLiftsAddsItToTheBoard() {
        step("open Choose lifts and tick the seeded lift");
        leaderboard.openChooser();
        leaderboard.tickLiftInChooser(LIFT);
        leaderboard.confirmChooser();

        step("verify the lift is now a choice on the board");
        if (!leaderboard.awaitLiftChip(LIFT)) {
            throw new AssertionError("Expected '" + LIFT + "' chip after choosing it");
        }

        step("reload and verify the choice was remembered");
        leaderboard.open(baseUrl);
        if (!leaderboard.awaitLiftChip(LIFT)) {
            throw new AssertionError("Expected '" + LIFT + "' chip to persist after reload");
        }
    }
}
