package com.kavin.fitness.e2e.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public class LeaderboardPage {
    private final WebDriver driver;
    private final WebDriverWait wait;

    private static final By PAGE = By.cssSelector(".lb-page");
    private static final By HERO_TITLE = By.cssSelector(".lb-hero h1");
    private static final By LOADING = By.cssSelector(".lb-loading");
    private static final By EX_TABS = By.cssSelector(".lb-ex-tab");
    private static final By ACTIVE_EX_TAB = By.cssSelector(".lb-ex-tab-active");
    private static final By EMPTY = By.cssSelector(".lb-empty");

    public LeaderboardPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(15));
    }

    public void open(String baseUrl) {
        driver.get(baseUrl + "/leaderboard");
        wait.until(ExpectedConditions.visibilityOfElementLocated(PAGE));
        // Wait for either the loading spinner to disappear, or hero to render
        wait.until(ExpectedConditions.invisibilityOfElementLocated(LOADING));
    }

    public boolean isHeroVisible() {
        return !driver.findElements(HERO_TITLE).isEmpty();
    }

    public String getHeroTitle() {
        return driver.findElement(HERO_TITLE).getText();
    }

    public boolean hasExerciseTabs() {
        return !driver.findElements(EX_TABS).isEmpty();
    }

    public String getActiveExerciseTabLabel() {
        var els = driver.findElements(ACTIVE_EX_TAB);
        return els.isEmpty() ? "" : els.get(0).getText();
    }

    public void clickExerciseTab(String label) {
        for (WebElement btn : driver.findElements(EX_TABS)) {
            if (btn.getText().equals(label)) {
                btn.click();
                return;
            }
        }
        throw new AssertionError("Exercise tab '" + label + "' not found");
    }

    /** Leaderboard requires opted-in users — for a fresh test user this is empty. */
    public boolean isEmptyMessageVisible() {
        return !driver.findElements(EMPTY).isEmpty();
    }
}
