package com.kavin.fitness.e2e.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.List;

public class WorkoutBuilderModal {
    private final WebDriver driver;
    private final WebDriverWait wait;

    private static final By TITLE = By.cssSelector(".modal-title");
    private static final By SESSION_NAME = By.cssSelector("input[placeholder*='push, pull, legs' i]");
    private static final By ADD_EXERCISE = By.xpath(
            "//button[contains(translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'+ exercise')]");
    private static final By ADD_RUN = By.xpath(
            "//button[contains(translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'+ run')]");
    private static final By ADD_TIMED = By.xpath(
            "//button[contains(translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'+ timed')]");
    private static final By SAVE = By.xpath(
            "//div[contains(@class,'modal')]//button[translate(text()," +
                    "'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')='save']");
    private static final By EXERCISE_NAME_INPUTS = By.cssSelector("input[placeholder*='exercise name' i]");
    private static final By ADD_SET_BTNS = By.xpath(
            "//button[contains(translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'+ set')]");
    private static final By TYPE_BTNS = By.cssSelector(".wbm-type-toggle");

    public WorkoutBuilderModal(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public WorkoutBuilderModal waitUntilVisible() {
        wait.until(ExpectedConditions.visibilityOfElementLocated(TITLE));
        String actual = driver.findElement(TITLE).getText();
        if (!actual.contains("Log Workout") && !actual.contains("Edit Workout")) {
            throw new AssertionError("Expected 'Log Workout' or 'Edit Workout' modal but got: " + actual);
        }
        return this;
    }

    public void enterSessionName(String name) {
        WebElement el = driver.findElement(SESSION_NAME);
        el.clear();
        el.sendKeys(name);
    }

    public void clickAddExercise() {
        WebElement btn = wait.until(ExpectedConditions.presenceOfElementLocated(ADD_EXERCISE));
        ((JavascriptExecutor) driver).executeScript("arguments[0].click();", btn);
    }

    public void clickAddRun() {
        WebElement btn = wait.until(ExpectedConditions.presenceOfElementLocated(ADD_RUN));
        ((JavascriptExecutor) driver).executeScript("arguments[0].click();", btn);
    }

    public void clickAddTimed() {
        WebElement btn = wait.until(ExpectedConditions.presenceOfElementLocated(ADD_TIMED));
        ((JavascriptExecutor) driver).executeScript("arguments[0].click();", btn);
    }

    public void waitForExerciseCount(int count) {
        wait.until(d -> d.findElements(EXERCISE_NAME_INPUTS).size() >= count);
    }

    public void enterExerciseName(int idx, String name) {
        wait.until(d -> d.findElements(EXERCISE_NAME_INPUTS).size() > idx);
        WebElement el = driver.findElements(EXERCISE_NAME_INPUTS).get(idx);
        el.clear();
        el.sendKeys(name);
    }

    public void enterWeight(int idx, String weight) {
        By inputs = By.cssSelector(".wbm-set-row input[placeholder='0']");
        wait.until(d -> d.findElements(inputs).size() > idx * 2);
        typeIntoNumberInput(driver.findElements(inputs).get(idx * 2), weight);
    }

    public void enterReps(int idx, String reps) {
        By inputs = By.cssSelector(".wbm-set-row input[placeholder='0']");
        wait.until(d -> d.findElements(inputs).size() > idx * 2 + 1);
        typeIntoNumberInput(driver.findElements(inputs).get(idx * 2 + 1), reps);
    }

    public void enterDistance(int idx, String distance) {
        By inputs = By.cssSelector(".wbm-set-row--cardio input[placeholder='0']");
        wait.until(d -> d.findElements(inputs).size() > idx * 3);
        typeIntoNumberInput(driver.findElements(inputs).get(idx * 3), distance);
    }

    public void enterRunMinutes(int idx, String minutes) {
        By inputs = By.cssSelector(".wbm-set-row--cardio input[placeholder='0']");
        wait.until(d -> d.findElements(inputs).size() > idx * 3 + 1);
        typeIntoNumberInput(driver.findElements(inputs).get(idx * 3 + 1), minutes);
    }

    public void enterRunSeconds(int idx, String seconds) {
        By inputs = By.cssSelector(".wbm-set-row--cardio input[placeholder='0']");
        wait.until(d -> d.findElements(inputs).size() > idx * 3 + 2);
        typeIntoNumberInput(driver.findElements(inputs).get(idx * 3 + 2), seconds);
    }

    public void enterDuration(int idx, String h, String m, String s) {
        By cardioInputs = By.cssSelector(".wbm-set-row--cardio input[placeholder='0']");
        wait.until(d -> d.findElements(cardioInputs).size() > idx * 3 + 2);
        // Re-query before each field to get a fresh reference after React re-renders.
        typeIntoNumberInput(driver.findElements(cardioInputs).get(idx * 3),     h);
        typeIntoNumberInput(driver.findElements(cardioInputs).get(idx * 3 + 1), m);
        typeIntoNumberInput(driver.findElements(cardioInputs).get(idx * 3 + 2), s);
    }

    /**
     * Type into a React-controlled type=number input.
     * Uses scroll+click to focus, then Ctrl+A to select all existing content,
     * then sendKeys to type the value. This fires real keyboard events that
     * React's onChange handles reliably in headless Chrome on Linux.
     * Avoids clear() which can fight with React's controlled value reconciliation.
     */
    private void typeIntoNumberInput(WebElement el, String value) {
        ((JavascriptExecutor) driver).executeScript("arguments[0].scrollIntoView({block:'center'});", el);
        el.click();
        el.sendKeys(Keys.chord(Keys.CONTROL, "a"));
        el.sendKeys(value);
    }

    public void clickAddSet(int exerciseIdx) {
        wait.until(d -> d.findElements(ADD_SET_BTNS).size() > exerciseIdx);
        WebElement btn = driver.findElements(ADD_SET_BTNS).get(exerciseIdx);
        ((JavascriptExecutor) driver).executeScript("arguments[0].scrollIntoView({block:'center'});", btn);
        ((JavascriptExecutor) driver).executeScript("arguments[0].click();", btn);
    }

    public void toggleExerciseType(int exerciseIdx) {
        wait.until(d -> d.findElements(TYPE_BTNS).size() > exerciseIdx);
        WebElement btn = driver.findElements(TYPE_BTNS).get(exerciseIdx);
        ((JavascriptExecutor) driver).executeScript("arguments[0].scrollIntoView({block:'center'});", btn);
        ((JavascriptExecutor) driver).executeScript("arguments[0].click();", btn);
    }

    public void save() {
        WebElement btn = wait.until(ExpectedConditions.presenceOfElementLocated(SAVE));
        ((JavascriptExecutor) driver).executeScript("arguments[0].scrollIntoView({block:'center'});", btn);
        ((JavascriptExecutor) driver).executeScript("arguments[0].click();", btn);
    }
}
