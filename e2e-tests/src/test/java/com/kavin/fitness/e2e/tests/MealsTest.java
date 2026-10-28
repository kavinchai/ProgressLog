package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.MealCards;
import com.kavin.fitness.e2e.pages.TodayPage;
import com.kavin.fitness.e2e.support.BaseTest;
import com.kavin.fitness.e2e.support.TestApiClient;
import java.time.LocalDate;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

/**
 * Meals are edited in place: Breakfast / Lunch / Dinner boxes are always on
 * the Today page, a box can be marked skipped, and extra meals get a
 * user-chosen label. No modal is involved.
 */
public class MealsTest extends BaseTest {
    private TodayPage today;
    private MealCards meals;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        String apiUrl = System.getProperty("env.apiurl", "http://localhost:8080/api");
        String username = System.getProperty("test.user.username", "qaf-test");
        String password = System.getProperty("test.user.password", "qaf-test-password");
        TestApiClient api = new TestApiClient(apiUrl);
        api.login(username, password);
        api.deleteNutritionOnDate(LocalDate.now().toString());

        today = new TodayPage(page);
        meals = new MealCards(page);
        navigateToToday();
    }

    @Test(priority = 1)
    public void breakfastLunchDinnerBoxesAreAlwaysShown() {
        step("with no nutrition log, all three slot boxes are on the page");
        meals.waitForCard("Breakfast");
        meals.waitForCard("Lunch");
        meals.waitForCard("Dinner");
    }

    @Test(priority = 2, dependsOnMethods = "breakfastLunchDinnerBoxesAreAlwaysShown")
    public void fillingBreakfastSavesWithoutAModal() {
        step("type Oatmeal, 620 kcal, 42 g into Breakfast and tab out");
        meals.fillMeal("Breakfast", "Oatmeal", "620", "42");

        step("wait until every field is saved (totals show 620 kcal / 42 g eaten)");
        today.waitForEaten("Calories", 620);
        today.waitForEaten("Protein", 42);

        step("reload: Breakfast still shows what was eaten");
        navigateToToday();
        meals.assertWhatYouAte("Breakfast", "Oatmeal");
        today.waitForEaten("Calories", 620);
    }

    @Test(priority = 3, dependsOnMethods = "fillingBreakfastSavesWithoutAModal")
    public void tickingSkippedRecordsASkippedMeal() {
        step("tick Skipped on Lunch and wait for it to save");
        meals.toggleSkipped("Lunch");
        meals.waitForSkippedSummary("Lunch");
        meals.waitForFirstSave("Lunch");

        step("reload: Lunch is still skipped and adds 0 kcal");
        navigateToToday();
        meals.waitForSkippedSummary("Lunch");
        meals.assertSkipped("Lunch");
        today.waitForEaten("Calories", 620);
    }

    @Test(priority = 4, dependsOnMethods = "fillingBreakfastSavesWithoutAModal")
    public void extraMealGetsItsOwnLabel() {
        step("+ Add meal, label it Snack, enter Protein bar 300 kcal 23 g");
        meals.addMeal("Snack");
        meals.fillMeal("Snack", "Protein bar", "300", "23");

        step("totals include the snack: 920 kcal / 65 g eaten");
        today.waitForEaten("Calories", 920);
        today.waitForEaten("Protein", 65);
    }

    @Test(priority = 5, dependsOnMethods = "extraMealGetsItsOwnLabel")
    public void deletingAnExtraMealRemovesItsBox() {
        step("delete Snack through the delete-with-undo dialog");
        meals.deleteMeal("Snack");

        step("totals drop back to 620 kcal eaten");
        today.waitForEaten("Calories", 620);
    }
}
