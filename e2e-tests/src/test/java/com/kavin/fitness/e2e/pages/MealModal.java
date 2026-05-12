package com.kavin.fitness.e2e.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public class MealModal {
    private final WebDriver driver;
    private final WebDriverWait wait;

    private static final By TITLE = By.cssSelector(".modal-title");
    private static final By NAME = By.cssSelector(".modal-box input[placeholder*='optional' i]");
    private static final By CALORIES = By.cssSelector(
            ".modal-box .modal-form-row .modal-field:nth-child(1) input[type='number']");
    private static final By PROTEIN = By.cssSelector(
            ".modal-box .modal-form-row .modal-field:nth-child(2) input[type='number']");
    private static final By SAVE = By.xpath(
            "//div[contains(@class,'modal')]//button[translate(text()," +
                    "'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')='save']");

    public MealModal(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public MealModal waitUntilVisible() {
        wait.until(ExpectedConditions.visibilityOfElementLocated(TITLE));
        return this;
    }

    public void enterName(String name) {
        WebElement el = driver.findElement(NAME);
        el.clear();
        el.sendKeys(name);
    }

    public void enterCalories(String calories) {
        WebElement el = driver.findElement(CALORIES);
        el.clear();
        el.sendKeys(calories);
    }

    public void enterProtein(String protein) {
        WebElement el = driver.findElement(PROTEIN);
        el.clear();
        el.sendKeys(protein);
    }

    public void save() {
        driver.findElement(SAVE).click();
    }
}
