package com.kavin.fitness.e2e.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public class WeightModal {
    private final WebDriver driver;
    private final WebDriverWait wait;

    private static final By TITLE = By.cssSelector(".modal-title");
    private static final By INPUT = By.cssSelector(".modal-box input[type='number']");
    private static final By SAVE = By.xpath(
            "//div[contains(@class,'modal')]//button[translate(text()," +
                    "'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')='save']");

    public WeightModal(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public WeightModal waitUntilVisibleWithTitle(String expectedTitle) {
        wait.until(ExpectedConditions.visibilityOfElementLocated(TITLE));
        String actual = driver.findElement(TITLE).getText();
        if (!actual.contains(expectedTitle)) {
            throw new AssertionError("Expected modal title to contain '" + expectedTitle + "' but got: " + actual);
        }
        return this;
    }

    public String getInputValue() {
        return driver.findElement(INPUT).getAttribute("value");
    }

    public void enterWeight(String weight) {
        WebElement input = driver.findElement(INPUT);
        input.clear();
        input.sendKeys(weight);
    }

    public void save() {
        driver.findElement(SAVE).click();
    }
}
