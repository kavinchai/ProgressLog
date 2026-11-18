package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.MealCards;
import com.kavin.fitness.e2e.pages.TodayPage;
import com.kavin.fitness.e2e.support.BaseTest;
import com.kavin.fitness.e2e.support.TestApiClient;
import java.time.LocalDate;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

/**
 * Meals are rows: Breakfast / Lunch / Dinner are always on the Today page,
 * tapping one opens the meal sheet, a meal can be marked skipped, and extra
 * meals get a user-chosen name.
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
    public void breakfastLunchDinnerRowsAreAlwaysShown() {
        step("with no nutrition log, all three meal rows are on the page");
        meals.waitForRow("Breakfast");
        meals.waitForRow("Lunch");
        meals.waitForRow("Dinner");
    }

    @Test(priority = 2, dependsOnMethods = "breakfastLunchDinnerRowsAreAlwaysShown")
    public void loggingBreakfastInTheSheetSavesIt() {
        step("+ Add Breakfast, enter Oatmeal, 620 kcal, 42 g and press Save");
        meals.logMeal("Breakfast", "Oatmeal", "620", "42");

        step("totals show 620 kcal / 42 g eaten and the row sums up the meal");
        today.waitForEaten("Calories", 620);
        today.waitForEaten("Protein", 42);
        meals.assertRowDetail("Breakfast", "Oatmeal · 620 kcal · 42 g");

        step("reload: Breakfast still shows what was eaten");
        navigateToToday();
        meals.assertRowDetail("Breakfast", "Oatmeal · 620 kcal · 42 g");
        today.waitForEaten("Calories", 620);
    }

    @Test(priority = 3, dependsOnMethods = "loggingBreakfastInTheSheetSavesIt")
    public void markingLunchSkippedRecordsASkippedMeal() {
        step("+ Add Lunch, tick Skipped lunch, Save");
        meals.skipMeal("Lunch");
        meals.assertRowDetail("Lunch", "Skipped");

        step("reload: Lunch is still skipped and adds 0 kcal");
        navigateToToday();
        meals.assertRowDetail("Lunch", "Skipped");
        today.waitForEaten("Calories", 620);
    }

    @Test(priority = 4, dependsOnMethods = "loggingBreakfastInTheSheetSavesIt")
    public void extraMealGetsItsOwnName() {
        step("+ Add meal, name it Snack, enter Protein bar 300 kcal 23 g, Save");
        meals.addExtraMeal("Snack", "Protein bar", "300", "23");

        step("totals include the snack: 920 kcal / 65 g eaten");
        today.waitForEaten("Calories", 920);
        today.waitForEaten("Protein", 65);
    }

    @Test(priority = 5, dependsOnMethods = "extraMealGetsItsOwnName")
    public void deletingAnExtraMealRemovesItsRow() {
        step("delete Snack from its menu (straight away, with an Undo bar)");
        meals.deleteMeal("Snack");

        step("totals drop back to 620 kcal eaten");
        today.waitForEaten("Calories", 620);
    }
}
