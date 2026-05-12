package com.kavin.fitness.e2e.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.List;

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
        WebElement input = driver.findElements(
                By.cssSelector(".modal-box .wbm-set-row .wbm-set-input")).get(setIdx * 2);
        input.clear();
        input.sendKeys(weight);
    }

    public void editDistance(int setIdx, String distance) {
        WebElement input = driver.findElements(
                By.cssSelector(".modal-box .wbm-set-row--cardio input[placeholder='0']")).get(setIdx * 3);
        input.clear();
        input.sendKeys(distance);
    }

    public void editMinutes(int setIdx, String minutes) {
        List<WebElement> inputs = driver.findElements(
                By.cssSelector(".modal-box .wbm-set-row--cardio input[placeholder='0']"));
        WebElement input = inputs.get(setIdx * 3 + 1);
        input.clear();
        input.sendKeys(minutes);
    }

    public void save() { driver.findElement(SAVE).click(); }
    public void deleteExercise() { driver.findElement(DELETE).click(); }
}
