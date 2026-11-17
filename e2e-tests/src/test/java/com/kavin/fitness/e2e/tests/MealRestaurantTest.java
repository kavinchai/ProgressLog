package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.MealCards;
import com.kavin.fitness.e2e.pages.TodayPage;
import com.kavin.fitness.e2e.support.BaseTest;
import com.kavin.fitness.e2e.support.TestApiClient;
import java.time.LocalDate;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

/**
 * Each meal has a Where (restaurant) field in its sheet. It saves with the
 * meal and comes back with it after delete-undo.
 */
public class MealRestaurantTest extends BaseTest {
    private final String todayDate = LocalDate.now().toString();
    private TestApiClient api;
    private TodayPage today;
    private MealCards meals;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        String apiUrl = System.getProperty("env.apiurl", "http://localhost:8080/api");
        String username = System.getProperty("test.user.username", "qaf-test");
        String password = System.getProperty("test.user.password", "qaf-test-password");
        api = new TestApiClient(apiUrl);
        api.login(username, password);
        api.deleteNutritionOnDate(todayDate);

        today = new TodayPage(page);
        meals = new MealCards(page);
        navigateToToday();
    }

    @AfterClass(alwaysRun = true)
    public void cleanup() {
        try {
            if (api != null) api.deleteNutritionOnDate(todayDate);
        } catch (Exception ignored) {}
    }

    @Test(priority = 1)
    public void restaurantSavesWithTheMeal() {
        step("log Dinner as Burrito bowl 900 kcal 50 g, then set its restaurant to Chipotle");
        meals.waitForRow("Dinner");
        meals.logMeal("Dinner", "Burrito bowl", "900", "50");
        today.waitForEaten("Calories", 900);
        meals.setRestaurant("Dinner", "Chipotle");

        step("reload: Dinner's sheet still says Chipotle");
        navigateToToday();
        meals.assertRestaurant("Dinner", "Chipotle");
    }

    @Test(priority = 2, dependsOnMethods = "restaurantSavesWithTheMeal")
    public void editedRestaurantSurvivesDeleteUndo() {
        step("add a Snack, then set its restaurant to Starbucks");
        meals.addExtraMeal("Snack", "Latte", "300", "10");
        today.waitForEaten("Calories", 1200);
        meals.setRestaurant("Snack", "Starbucks");

        step("delete the Snack and press Undo");
        meals.deleteMealAndUndo("Snack");
        today.waitForEaten("Calories", 1200);

        step("reload: the restored Snack still says Starbucks");
        navigateToToday();
        meals.assertRestaurant("Snack", "Starbucks");
    }
}
