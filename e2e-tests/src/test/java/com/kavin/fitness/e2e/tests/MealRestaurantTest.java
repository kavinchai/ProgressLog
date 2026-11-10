package com.kavin.fitness.e2e.tests;

import static org.testng.Assert.assertTrue;

import com.kavin.fitness.e2e.pages.MealCards;
import com.kavin.fitness.e2e.pages.TodayPage;
import com.kavin.fitness.e2e.support.BaseTest;
import com.kavin.fitness.e2e.support.TestApiClient;
import java.time.LocalDate;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

/**
 * Each meal box has a Restaurant field: beside the meal label on desktop,
 * on its own line under the label on phones. It saves with the meal and
 * comes back with it after delete-undo.
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
    public void restaurantSavesWithTheMealAndSitsBesideTheLabel() {
        step("enter Chipotle as Dinner's restaurant, then Burrito bowl 900 kcal 50 g");
        meals.waitForCard("Dinner");
        meals.fillRestaurant("Dinner", "Chipotle");
        meals.fillMeal("Dinner", "Burrito bowl", "900", "50");
        today.waitForEaten("Calories", 900);

        step("reload: Dinner still shows Chipotle, to the right of the label");
        navigateToToday();
        meals.assertRestaurant("Dinner", "Chipotle");
        assertTrue(meals.restaurantIsRightOfLabel("Dinner"),
                "restaurant should sit to the right of the meal label on desktop");
    }

    @Test(priority = 2, dependsOnMethods = "restaurantSavesWithTheMealAndSitsBesideTheLabel")
    public void editedRestaurantSurvivesDeleteUndo() {
        step("add a Snack, save it, then set its restaurant to Starbucks");
        meals.addMeal("Snack");
        meals.fillMeal("Snack", "Latte", "300", "10");
        today.waitForEaten("Calories", 1200);
        meals.editRestaurant("Snack", "Starbucks");

        step("the short Snack label doesn't push its restaurant far to the right");
        // "SNACK" is ~45px wide; the old fixed-width label field put the pill ~190px in.
        assertTrue(meals.restaurantOffsetFromLabelStart("Snack") < 100,
                "restaurant should sit right after a short custom label");

        step("delete the Snack and press Undo");
        meals.deleteMealAndUndo("Snack");
        today.waitForEaten("Calories", 1200);

        step("reload: the restored Snack still says Starbucks");
        navigateToToday();
        meals.assertRestaurant("Snack", "Starbucks");
    }

    @Test(priority = 3, dependsOnMethods = "restaurantSavesWithTheMealAndSitsBesideTheLabel")
    public void restaurantMovesUnderTheLabelOnPhones() {
        step("switch to phone width and reload Today");
        page.setViewportSize(390, 844);
        navigateToToday();

        step("Dinner's restaurant is on its own line under the label");
        meals.assertRestaurant("Dinner", "Chipotle");
        assertTrue(meals.restaurantIsBelowLabel("Dinner"),
                "restaurant should sit under the meal label on phones");
    }
}
