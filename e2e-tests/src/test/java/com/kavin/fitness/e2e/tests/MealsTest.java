package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.MealModal;
import com.kavin.fitness.e2e.pages.TodayPage;
import com.kavin.fitness.e2e.support.BaseTest;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

public class MealsTest extends BaseTest {
    private TodayPage today;
    private MealModal modal;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        today = new TodayPage(driver);
        modal = new MealModal(driver);
        navigateToToday();
    }

    @Test(priority = 1)
    public void addNewMealCreatesNutritionLog() {
        step("click Add Meal");
        today.clickAddMeal();
        modal.waitUntilVisible();

        step("enter 'Lunch', 800 cal, 50g protein, save");
        modal.enterName("Lunch");
        modal.enterCalories("800");
        modal.enterProtein("50");
        modal.save();

        step("modal closed and meal 'Lunch' is displayed");
        waitForModalClosed();
        today.waitForMealDisplayed("Lunch");
    }

    @Test(priority = 2, dependsOnMethods = "addNewMealCreatesNutritionLog")
    public void nutritionTotalsUpdateAfterAddingMeals() {
        step("Lunch is already displayed");
        today.waitForMealDisplayed("Lunch");

        step("add Dinner: 700 cal, 45g protein");
        today.clickAddMeal();
        modal.waitUntilVisible();
        modal.enterName("Dinner");
        modal.enterCalories("700");
        modal.enterProtein("45");
        modal.save();
        waitForModalClosed();

        step("Dinner is displayed and totals show 1500 kcal / 95g protein");
        today.waitForMealDisplayed("Dinner");
        today.waitForNutritionTotal("1500");
        today.waitForNutritionTotal("95");
    }

    @Test(priority = 3, dependsOnMethods = "addNewMealCreatesNutritionLog")
    public void addMealWithoutNameUsesDefaultNumbering() {
        step("click Add Meal");
        today.clickAddMeal();
        modal.waitUntilVisible();

        step("enter calories 500, protein 30, save (no name)");
        modal.enterCalories("500");
        modal.enterProtein("30");
        modal.save();

        step("modal closes");
        waitForModalClosed();
    }
}
