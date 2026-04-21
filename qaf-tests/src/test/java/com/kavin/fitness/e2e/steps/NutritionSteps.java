package com.kavin.fitness.e2e.steps;

import com.kavin.fitness.e2e.pages.MealModal;
import com.kavin.fitness.e2e.pages.TodayPage;
import com.qmetry.qaf.automation.step.QAFTestStep;
import com.qmetry.qaf.automation.ui.WebDriverTestBase;
import org.openqa.selenium.By;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public class NutritionSteps {

    private final TodayPage todayPage = new TodayPage();
    private final MealModal mealModal = new MealModal();

    // ── Steps ────────────────────────────────────────────────────────────────

    @QAFTestStep(description = "user clicks Add Steps button")
    public void userClicksAddSteps() {
        todayPage.clickAddSteps();
    }

    @QAFTestStep(description = "user enters steps value {steps}")
    public void userEntersStepsValue(String steps) {
        todayPage.enterSteps(steps);
    }

    @QAFTestStep(description = "user saves the steps")
    public void userSavesSteps() {
        todayPage.saveSteps();
    }

    @QAFTestStep(description = "user deletes the steps")
    public void userDeletesSteps() {
        todayPage.clickDeleteSteps();
    }

    @QAFTestStep(description = "steps displays {value} on the page")
    public void stepsDisplaysOnPage(String value) {
        WebDriverWait wait = new WebDriverWait(
                new WebDriverTestBase().getDriver(), Duration.ofSeconds(5));
        wait.until(ExpectedConditions.textToBePresentInElementLocated(
                By.cssSelector(".day-detail-section:nth-child(3) .day-detail-value"),
                value));
    }

    // ── Meals ────────────────────────────────────────────────────────────────

    @QAFTestStep(description = "user clicks Add Meal button")
    public void userClicksAddMeal() {
        todayPage.clickAddMeal();
    }

    @QAFTestStep(description = "meal modal is displayed")
    public void mealModalIsDisplayed() {
        WebDriverWait wait = new WebDriverWait(
                new WebDriverTestBase().getDriver(), Duration.ofSeconds(5));
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector(".modal-title")));
    }

    @QAFTestStep(description = "user enters meal name {name}")
    public void userEntersMealName(String name) {
        mealModal.enterMealName(name);
    }

    @QAFTestStep(description = "user enters calories {calories}")
    public void userEntersCalories(String calories) {
        mealModal.enterCalories(calories);
    }

    @QAFTestStep(description = "user enters protein {protein}")
    public void userEntersProtein(String protein) {
        mealModal.enterProtein(protein);
    }

    @QAFTestStep(description = "user saves the meal")
    public void userSavesMeal() {
        mealModal.save();
    }

    @QAFTestStep(description = "meal {name} is displayed on the page")
    public void mealIsDisplayed(String name) {
        WebDriverWait wait = new WebDriverWait(
                new WebDriverTestBase().getDriver(), Duration.ofSeconds(5));
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.xpath("//span[contains(@class,'day-meal-name') and contains(text(),'" + name + "')]")));
    }

    @QAFTestStep(description = "nutrition total shows {text}")
    public void nutritionTotalShows(String text) {
        WebDriverWait wait = new WebDriverWait(
                new WebDriverTestBase().getDriver(), Duration.ofSeconds(5));
        wait.until(ExpectedConditions.textToBePresentInElementLocated(
                By.cssSelector(".day-nutrition-total"), text));
    }
}
