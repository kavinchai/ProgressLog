package com.kavin.fitness.e2e.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public class EditExerciseModal {
    private final WebDriver driver;
    private final WebDriverWait wait;

    private static final By TITLE = By.cssSelector(".modal-title");
    private static final By SAVE = By.xpath(
            "//div[contains(@class,'modal')]//button[translate(text()," +
                    "'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')='save']");
    private static final By DELETE = By.xpath(
            "//div[contains(@class,'modal')]//button[contains(translate(text()," +
                    "'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'delete')]");

    public EditExerciseModal(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public EditExerciseModal waitUntilTitleContains(String expected) {
        wait.until(ExpectedConditions.visibilityOfElementLocated(TITLE));
        String actual = driver.findElement(TITLE).getText();
        if (!actual.contains(expected)) {
            throw new AssertionError("Expected title to contain '" + expected + "' but got: " + actual);
        }
        return this;
    }

    public void editWeight(int setIdx, String weight) {
        By inputs = By.cssSelector(".modal-box .wbm-set-row .wbm-set-input");
        wait.until(d -> d.findElements(inputs).size() > setIdx * 2);
        typeIntoNumberInput(driver.findElements(inputs).get(setIdx * 2), weight);
    }

    public void editDistance(int setIdx, String distance) {
        By inputs = By.cssSelector(".modal-box .wbm-set-row--cardio input[placeholder='0']");
        wait.until(d -> d.findElements(inputs).size() > setIdx * 3);
        typeIntoNumberInput(driver.findElements(inputs).get(setIdx * 3), distance);
    }

    public void editMinutes(int setIdx, String minutes) {
        By inputs = By.cssSelector(".modal-box .wbm-set-row--cardio input[placeholder='0']");
        wait.until(d -> d.findElements(inputs).size() > setIdx * 3 + 1);
        typeIntoNumberInput(driver.findElements(inputs).get(setIdx * 3 + 1), minutes);
    }

    public void save() { driver.findElement(SAVE).click(); }

    /**
     * Delete the exercise via the inline confirmation flow:
     * click "Delete Exercise" → click "Confirm Delete" → click "Done".
     */
    public void deleteExercise() {
        driver.findElement(DELETE).click();
        By confirmBtn = By.xpath(
                "//div[contains(@class,'modal')]//button[contains(text(),'Confirm Delete')]");
        wait.until(ExpectedConditions.elementToBeClickable(confirmBtn)).click();
        By doneBtn = By.xpath(
                "//div[contains(@class,'modal')]//button[text()='Done']");
        wait.until(ExpectedConditions.elementToBeClickable(doneBtn)).click();
    }

    /**
     * Type into a React-controlled type=number input. Same robust pattern as
     * WorkoutBuilderModal.typeIntoNumberInput — scroll+click+Ctrl+A+type fires
     * real keyboard events that React's onChange handles reliably in headless
     * Chrome. Avoids clear() which can fight React's controlled value.
     */
    private void typeIntoNumberInput(WebElement el, String value) {
        ((JavascriptExecutor) driver).executeScript("arguments[0].scrollIntoView({block:'center'});", el);
        el.click();
        el.sendKeys(Keys.chord(Keys.CONTROL, "a"));
        el.sendKeys(value);
    }
}
