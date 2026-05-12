package com.kavin.fitness.e2e.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.List;

public class TodayPage {
    private final WebDriver driver;
    private final WebDriverWait wait;

    private static final int WEIGHT_IDX = 1;
    private static final int STEPS_IDX = 3;
    private static final int WORKOUT_IDX = 4;

    public TodayPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    private WebElement sectionBtnContains(int sectionIdx, String text) {
        return driver.findElement(By.xpath(
                "//div[contains(@class,'day-detail-section')][" + sectionIdx +
                        "]//button[contains(text(),'" + text + "')]"));
    }

    private WebElement sectionBtnExact(int sectionIdx, String text) {
        return driver.findElement(By.xpath(
                "//div[contains(@class,'day-detail-section')][" + sectionIdx +
                        "]//button[text()='" + text + "']"));
    }

    // ── Weight ───────────────────────────────────────────────────────────────

    public void clickAddWeight() { sectionBtnContains(WEIGHT_IDX, "+ Add").click(); }
    public void clickEditWeight() { sectionBtnExact(WEIGHT_IDX, "Edit").click(); }

    public void waitForWeightValue(String expected) {
        wait.until(ExpectedConditions.textToBePresentInElementLocated(
                By.cssSelector(".day-detail-section:nth-child(" + WEIGHT_IDX + ") .day-detail-value"),
                expected));
    }

    // ── Steps ────────────────────────────────────────────────────────────────

    public void clickAddSteps() { sectionBtnContains(STEPS_IDX, "+ Add").click(); }

    public void clickDeleteSteps() {
        driver.findElement(By.xpath(
                "//div[contains(@class,'day-detail-section')][" + STEPS_IDX +
                        "]//button[contains(@class,'btn-danger')]")).click();
    }

    public void enterSteps(String value) {
        WebElement input = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector(".today-steps-edit input[type='number']")));
        input.clear();
        input.sendKeys(value);
    }

    public void saveSteps() {
        driver.findElement(By.cssSelector(".today-steps-edit .btn-primary")).click();
    }

    public void waitForStepsValue(String expected) {
        wait.until(ExpectedConditions.textToBePresentInElementLocated(
                By.cssSelector(".day-detail-section:nth-child(" + STEPS_IDX + ") .day-detail-value"),
                expected));
    }

    // ── Nutrition / Meals ────────────────────────────────────────────────────

    public void clickAddMeal() {
        driver.findElement(By.xpath(
                "//button[contains(text(),'+ Add Meal') or contains(text(),'+ Meal')]")).click();
    }

    public void waitForMealDisplayed(String name) {
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.xpath("//span[contains(@class,'day-meal-name') and contains(text(),'" + name + "')]")));
    }

    public void waitForNutritionTotal(String text) {
        wait.until(ExpectedConditions.textToBePresentInElementLocated(
                By.cssSelector(".day-nutrition-total"), text));
    }

    // ── Workout ──────────────────────────────────────────────────────────────

    public void clickAddWorkout() { sectionBtnContains(WORKOUT_IDX, "+ Add").click(); }

    public void renameWorkoutSession(String newName) {
        sectionBtnExact(WORKOUT_IDX, "Rename").click();
        WebElement input = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector(".day-detail-section:nth-child(" + WORKOUT_IDX + ") input[type='text']")));
        input.clear();
        input.sendKeys(newName);
        driver.findElement(By.xpath(
                "//div[contains(@class,'day-detail-section')][" + WORKOUT_IDX +
                        "]//button[contains(@class,'btn-primary') and text()='Save']")).click();
    }

    public void waitForSessionName(String name) {
        wait.until(ExpectedConditions.textToBePresentInElementLocated(
                By.cssSelector(".day-detail-section:nth-child(" + WORKOUT_IDX +
                        ") .day-detail-label .muted"),
                name));
    }

    // ── Exercises ────────────────────────────────────────────────────────────

    public void waitForExercise(String name) {
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.xpath("//span[contains(@class,'day-exercise-name') and contains(text(),'" + name + "')]")));
    }

    public void waitForExerciseDetail(String exerciseName, String detail) {
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.xpath("//div[contains(@class,'day-exercise-item')]" +
                        "[.//span[contains(text(),'" + exerciseName + "')]]" +
                        "[.//*[contains(text(),'" + detail + "')]]")));
    }

    public void assertExerciseDoesNotShowWeight(String name) {
        List<WebElement> items = driver.findElements(By.xpath(
                "//div[contains(@class,'day-exercise-item')]" +
                        "[.//span[contains(text(),'" + name + "')]]" +
                        "[.//span[contains(text(),'lbs')]]"));
        if (!items.isEmpty()) {
            throw new AssertionError("Expected no weight display for " + name + " but found one");
        }
    }

    public void clickEditExercise(int index) {
        List<WebElement> editBtns = driver.findElements(By.cssSelector(".day-exercise-item .btn"));
        editBtns.get(index).click();
    }

    public boolean isTextVisible(String text) {
        return !driver.findElements(By.xpath("//*[contains(text(),'" + text + "')]")).isEmpty();
    }

    public boolean isExerciseVisible(String name) {
        return !driver.findElements(By.xpath(
                "//span[contains(@class,'day-exercise-name') and contains(text(),'" + name + "')]"))
                .isEmpty();
    }
}
