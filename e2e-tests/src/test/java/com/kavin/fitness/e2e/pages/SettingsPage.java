package com.kavin.fitness.e2e.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.List;

public class SettingsPage {
    private final WebDriver driver;
    private final WebDriverWait wait;

    private static final By PAGE_TITLE = By.cssSelector(".settings-title");
    private static final By GOALS_SECTION = By.xpath(
            "//h2[contains(@class,'settings-card-title') and text()='Goals']");
    private static final By PREFERENCES_SECTION = By.xpath(
            "//h2[contains(@class,'settings-card-title') and text()='Preferences']");
    private static final By INTEGRATIONS_SECTION = By.xpath(
            "//h2[contains(@class,'settings-card-title') and text()='Integrations']");
    private static final By TRAINING_INPUT = By.cssSelector("#calorieTargetTraining");
    private static final By REST_INPUT = By.cssSelector("#calorieTargetRest");
    private static final By PROTEIN_INPUT = By.cssSelector("#proteinTarget");
    private static final By SAVE_GOALS = By.xpath(
            "//button[contains(@class,'btn-primary') and contains(text(),'Save Goals')]");
    private static final By SAVED_MESSAGE = By.cssSelector(".settings-saved");
    private static final By UNIT_TOGGLE = By.cssSelector(".unit-toggle");
    private static final By ACTIVE_UNIT = By.cssSelector(".unit-toggle-label.active");
    private static final By CLAUDE_SETUP_BTN = By.xpath(
            "//button[contains(text(),'Claude integration')]");

    public SettingsPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public void open(String baseUrl) {
        driver.get(baseUrl + "/settings");
        wait.until(ExpectedConditions.visibilityOfElementLocated(PAGE_TITLE));
    }

    public String getPageTitle() {
        return driver.findElement(PAGE_TITLE).getText();
    }

    public boolean isGoalsSectionVisible() {
        return !driver.findElements(GOALS_SECTION).isEmpty();
    }

    public boolean isPreferencesSectionVisible() {
        return !driver.findElements(PREFERENCES_SECTION).isEmpty();
    }

    public boolean isIntegrationsSectionVisible() {
        return !driver.findElements(INTEGRATIONS_SECTION).isEmpty();
    }

    public void enterTrainingCalories(String value) {
        WebElement el = driver.findElement(TRAINING_INPUT);
        el.clear();
        el.sendKeys(value);
    }

    public void enterRestCalories(String value) {
        WebElement el = driver.findElement(REST_INPUT);
        el.clear();
        el.sendKeys(value);
    }

    public void enterProteinTarget(String value) {
        WebElement el = driver.findElement(PROTEIN_INPUT);
        el.clear();
        el.sendKeys(value);
    }

    public String getTrainingCalories() {
        return driver.findElement(TRAINING_INPUT).getAttribute("value");
    }

    public String getRestCalories() {
        return driver.findElement(REST_INPUT).getAttribute("value");
    }

    public String getProteinTarget() {
        return driver.findElement(PROTEIN_INPUT).getAttribute("value");
    }

    public void clickSaveGoals() {
        driver.findElement(SAVE_GOALS).click();
    }

    public void waitForSavedMessage() {
        wait.until(ExpectedConditions.visibilityOfElementLocated(SAVED_MESSAGE));
    }

    public String getActiveWeightUnit() {
        List<WebElement> active = driver.findElements(ACTIVE_UNIT);
        return active.isEmpty() ? "" : active.get(0).getText();
    }

    public void clickUnitToggle() {
        driver.findElement(UNIT_TOGGLE).click();
    }

    public void waitForActiveUnit(String unit) {
        wait.until(d -> {
            List<WebElement> labels = d.findElements(ACTIVE_UNIT);
            return !labels.isEmpty() && labels.get(0).getText().equals(unit);
        });
    }

    public boolean isClaudeSetupButtonVisible() {
        return !driver.findElements(CLAUDE_SETUP_BTN).isEmpty();
    }
}
