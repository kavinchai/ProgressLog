package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.LeaderboardPage;
import com.kavin.fitness.e2e.support.BaseTest;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

/**
 * Smoke coverage for /community (leaderboard view). Seeding community-wide data is impractical
 * (depends on other users opting in to share), so these tests only verify the
 * page renders, the title is shown, and the This month / All time switch is wired up.
 * Empty states are acceptable.
 */
public class LeaderboardPageTest extends BaseTest {
    private LeaderboardPage leaderboard;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        leaderboard = new LeaderboardPage(page);
        leaderboard.open(baseUrl);
    }

    @Test(priority = 1)
    public void leaderboardPageLoadsWithTitle() {
        step("verify page title rendered");
        if (!leaderboard.isTitleVisible()) {
            throw new AssertionError("Expected page title to render");
        }
        String title = leaderboard.getTitle();
        if (!title.toLowerCase().contains("community")) {
            throw new AssertionError("Expected page title to mention 'community', got: " + title);
        }
    }

    @Test(priority = 2, dependsOnMethods = "leaderboardPageLoadsWithTitle")
    public void liftChoicesRenderOrEmptyStateShown() {
        // Either lift choices render (someone lifted this month) or an empty-state message is shown.
        step("verify either lift choices render or empty state is shown");
        boolean liftsPresent = leaderboard.hasLiftChoices();
        boolean emptyShown = leaderboard.isEmptyMessageVisible();
        if (!liftsPresent && !emptyShown) {
            throw new AssertionError(
                    "Expected either lift choices or an empty-state message to appear");
        }
    }

    @Test(priority = 3, dependsOnMethods = "liftChoicesRenderOrEmptyStateShown")
    public void switchBetweenThisMonthAndAllTime() {
        if (!leaderboard.hasPeriodSwitch()) {
            // No one shares, so there is no board and no period switch.
            step("no sharers (empty leaderboard) — skipping period switch test");
            return;
        }

        step("verify This month is active by default");
        if (!"This month".equals(leaderboard.getActivePeriod())) {
            throw new AssertionError("Expected 'This month' active, got: "
                    + leaderboard.getActivePeriod());
        }

        step("choose All time");
        leaderboard.choosePeriod("All time");
        leaderboard.waitForActivePeriod("All time");

        step("switch back to This month");
        leaderboard.choosePeriod("This month");
        leaderboard.waitForActivePeriod("This month");
    }
}
