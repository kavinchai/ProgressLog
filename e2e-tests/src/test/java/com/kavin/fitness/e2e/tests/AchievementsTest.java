package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.AchievementsPage;
import com.kavin.fitness.e2e.support.BaseTest;
import com.kavin.fitness.e2e.support.TestApiClient;
import com.microsoft.playwright.Locator;
import java.time.LocalDate;
import java.util.List;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

/**
 * Achievements are worked out in the app from the workouts already logged.
 * Seeds a 225 lb deadlift, then checks the plate clubs it earns, the badge
 * sheet, and that every weight milestone shows its own drawing file.
 */
public class AchievementsTest extends BaseTest {
    private AchievementsPage achievements;
    private TestApiClient api;
    private String seededDate;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        achievements = new AchievementsPage(page);

        String apiUrl = System.getProperty("env.apiurl", "http://localhost:8080/api");
        String username = System.getProperty("test.user.username", "qaf-test");
        String password = System.getProperty("test.user.password", "qaf-test-password");
        api = new TestApiClient(apiUrl);
        api.login(username, password);

        seededDate = LocalDate.now().minusDays(3).toString();
        api.deleteWorkoutsOnDate(seededDate, "Achievements E2E");
        api.logLiftingWorkout(seededDate, "Achievements E2E", "Deadlift", 225.0, 5);
    }

    @AfterClass(alwaysRun = true)
    public void cleanup() {
        try {
            if (api != null) api.deleteWorkoutsOnDate(seededDate, "Achievements E2E");
        } catch (Exception ignored) {}
    }

    @Test(priority = 1)
    public void progressCardOpensAchievementsWithEarnedPlateClubs() {
        step("open Progress and tap the Achievements card");
        achievements.openFromProgress(baseUrl);

        step("the 225 lb deadlift earns the 1- and 2-plate deadlift clubs");
        if (!achievements.isBadgeEarned("2-plate deadlift")) {
            throw new AssertionError("Expected '2-plate deadlift' to show as earned");
        }
    }

    @Test(priority = 2, dependsOnMethods = "progressCardOpensAchievementsWithEarnedPlateClubs")
    public void badgeSheetListsTheLiftsLevels() {
        step("tap 2-plate deadlift");
        Locator sheet = achievements.openBadge("2-plate deadlift");

        step("the sheet says when it was earned and lists the deadlift's levels");
        String text = sheet.innerText();
        if (!text.contains("Earned ")) {
            throw new AssertionError("Expected an 'Earned …' date in the badge sheet, got: " + text);
        }
        for (String level : List.of("1-plate deadlift", "3-plate deadlift", "5-plate deadlift")) {
            if (!text.contains(level)) {
                throw new AssertionError("Expected '" + level + "' in the badge sheet levels");
            }
        }
        achievements.closeSheet();
    }

    @Test(priority = 3, dependsOnMethods = "progressCardOpensAchievementsWithEarnedPlateClubs")
    public void weightMilestonesEachShowTheirOwnDrawing() {
        step("open the lifetime weight screen");
        achievements.openWeightLifted();

        step("each milestone shows its drawing from /achievements/");
        List<String> drawings = achievements.milestoneDrawings();
        List<String> expected = List.of(
                "/achievements/piano.svg",
                "/achievements/car.svg",
                "/achievements/elephant.svg",
                "/achievements/t-rex.svg",
                "/achievements/school-bus.svg",
                "/achievements/boeing-737.svg",
                "/achievements/space-shuttle.svg",
                "/achievements/blue-whale.svg");
        if (!drawings.equals(expected)) {
            throw new AssertionError("Expected milestone drawings " + expected + ", got: " + drawings);
        }

        step("the drawing files load");
        for (String src : expected) {
            int status = page.request().get(baseUrl + src).status();
            if (status != 200) {
                throw new AssertionError("Expected " + src + " to load, got HTTP " + status);
            }
        }
    }
}
