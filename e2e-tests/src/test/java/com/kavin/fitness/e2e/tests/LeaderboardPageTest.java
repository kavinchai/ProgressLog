package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.LeaderboardPage;
import com.kavin.fitness.e2e.support.BaseTest;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

/**
 * Smoke coverage for /leaderboard. Seeding community-wide data is impractical
 * (depends on other users opting in to share), so these tests only verify the
 * page renders, the hero is shown, and the strength/cardio tabs are wired up.
 * Empty states are acceptable.
 */
public class LeaderboardPageTest extends BaseTest {
    private LeaderboardPage leaderboard;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        leaderboard = new LeaderboardPage(driver);
        leaderboard.open(baseUrl);
    }

    @Test(priority = 1)
    public void leaderboardPageLoadsWithHero() {
        step("verify hero title rendered");
        if (!leaderboard.isHeroVisible()) {
            throw new AssertionError("Expected hero title to render");
        }
        String title = leaderboard.getHeroTitle();
        if (!title.toLowerCase().contains("leaderboard")) {
            throw new AssertionError("Expected hero title to mention 'leaderboard', got: " + title);
        }
    }

    @Test(priority = 2, dependsOnMethods = "leaderboardPageLoadsWithHero")
    public void exerciseTabsRenderOrEmptyStateShown() {
        // Either tabs render (totalUsers > 0) or empty-state message is shown.
        step("verify either tabs render or empty state is shown");
        boolean tabsPresent = leaderboard.hasExerciseTabs();
        boolean emptyShown = leaderboard.isEmptyMessageVisible();
        if (!tabsPresent && !emptyShown) {
            throw new AssertionError(
                    "Expected either leaderboard tabs or an empty-state message to appear");
        }
    }

    @Test(priority = 3, dependsOnMethods = "exerciseTabsRenderOrEmptyStateShown")
    public void switchBetweenStrengthAndCardioTabs() {
        if (!leaderboard.hasExerciseTabs()) {
            // No data — nothing to switch. Skip gracefully via assertion that passes.
            step("no tabs available (empty leaderboard) — skipping switch test");
            return;
        }

        step("verify Strength is active by default");
        if (!"Strength".equals(leaderboard.getActiveExerciseTabLabel())) {
            throw new AssertionError("Expected 'Strength' active, got: "
                    + leaderboard.getActiveExerciseTabLabel());
        }

        step("click Cardio tab");
        leaderboard.clickExerciseTab("Cardio");
        if (!"Cardio".equals(leaderboard.getActiveExerciseTabLabel())) {
            throw new AssertionError("Expected 'Cardio' active after click");
        }

        step("switch back to Strength");
        leaderboard.clickExerciseTab("Strength");
        if (!"Strength".equals(leaderboard.getActiveExerciseTabLabel())) {
            throw new AssertionError("Expected 'Strength' active after click");
        }
    }
}
