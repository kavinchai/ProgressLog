package com.kavin.fitness.e2e.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.List;

public class ProgressPage {
    private final WebDriver driver;
    private final WebDriverWait wait;

    private static final By PAGE_TABS = By.cssSelector(".page-tabs .page-tab");
    private static final By ACTIVE_TAB = By.cssSelector(".page-tabs .page-tab-active");
    private static final By STRENGTH_HEADER = By.xpath("//div[contains(@class,'strength-header')]/h1");
    private static final By CARDIO_HEADER = By.xpath("//div[contains(@class,'cardio-header')]/h1");
    private static final By STRENGTH_SIDEBAR = By.cssSelector("[data-testid='strength-sidebar']");
    private static final By CARDIO_SIDEBAR = By.cssSelector("[data-testid='cardio-sidebar']");
    private static final By STRENGTH_SIDEBAR_ITEMS = By.cssSelector(".strength-sidebar-item");
    private static final By CARDIO_SIDEBAR_ITEMS = By.cssSelector(".cardio-sidebar-item");
    private static final By STRENGTH_RANGE_BTNS = By.cssSelector(".strength-range-btn");
    private static final By SESSION_TABLE = By.cssSelector("[data-testid='session-history-table']");
    private static final By STRENGTH_EMPTY = By.cssSelector(".strength-empty");
    private static final By CARDIO_EMPTY = By.cssSelector(".cardio-empty");
    private static final By LOADING = By.cssSelector(".loading-state");

    public ProgressPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(15));
    }

    public void openStrength(String baseUrl) {
        driver.get(baseUrl + "/progress/strength");
        waitForLoaded();
    }

    public void openCardio(String baseUrl) {
        driver.get(baseUrl + "/progress/cardio");
        waitForLoaded();
    }

    /** Wait until the loading spinner is gone (whichever tab we landed on). */
    private void waitForLoaded() {
        wait.until(ExpectedConditions.invisibilityOfElementLocated(LOADING));
    }

    public List<String> getTabLabels() {
        return driver.findElements(PAGE_TABS).stream().map(WebElement::getText).toList();
    }

    public String getActiveTabLabel() {
        List<WebElement> els = driver.findElements(ACTIVE_TAB);
        return els.isEmpty() ? "" : els.get(0).getText();
    }

    public void clickTab(String label) {
        driver.findElement(By.xpath(
                "//nav[contains(@class,'page-tabs')]//a[text()='" + label + "']")).click();
        waitForLoaded();
    }

    // ── Strength ─────────────────────────────────────────────────────────────

    public boolean isStrengthHeaderVisible() {
        return !driver.findElements(STRENGTH_HEADER).isEmpty();
    }

    public boolean isStrengthSidebarVisible() {
        return !driver.findElements(STRENGTH_SIDEBAR).isEmpty();
    }

    public boolean isStrengthEmptyStateVisible() {
        return !driver.findElements(STRENGTH_EMPTY).isEmpty();
    }

    public int getStrengthExerciseCount() {
        return driver.findElements(STRENGTH_SIDEBAR_ITEMS).size();
    }

    public void clickStrengthExercise(String name) {
        for (WebElement btn : driver.findElements(STRENGTH_SIDEBAR_ITEMS)) {
            if (btn.findElement(By.cssSelector(".strength-sidebar-item-name")).getText().equals(name)) {
                btn.click();
                return;
            }
        }
        throw new AssertionError("Strength exercise '" + name + "' not in sidebar");
    }

    public boolean isStrengthExerciseActive(String name) {
        for (WebElement btn : driver.findElements(STRENGTH_SIDEBAR_ITEMS)) {
            if (btn.findElement(By.cssSelector(".strength-sidebar-item-name")).getText().equals(name)) {
                return btn.getAttribute("class").contains("strength-sidebar-item-active");
            }
        }
        return false;
    }

    public boolean isSessionTableVisible() {
        return !driver.findElements(SESSION_TABLE).isEmpty();
    }

    public int getSessionRowCount() {
        return driver.findElements(By.cssSelector("[data-testid='session-history-table'] tbody tr")).size();
    }

    public String getCurrentMaxValue() {
        List<WebElement> els = driver.findElements(By.cssSelector(
                "[data-testid='stat-current-max'] .strength-stat-value"));
        return els.isEmpty() ? "" : els.get(0).getText();
    }

    public boolean hasPRRow() {
        return !driver.findElements(By.cssSelector(".strength-pr-row")).isEmpty();
    }

    public boolean hasPRBadge() {
        return !driver.findElements(By.cssSelector(".strength-pr-tag")).isEmpty();
    }

    public void clickStrengthRange(String label) {
        for (WebElement btn : driver.findElements(STRENGTH_RANGE_BTNS)) {
            if (btn.getText().equals(label)) {
                btn.click();
                return;
            }
        }
        throw new AssertionError("Strength range '" + label + "' not found");
    }

    public boolean isStrengthRangeActive(String label) {
        for (WebElement btn : driver.findElements(STRENGTH_RANGE_BTNS)) {
            if (btn.getText().equals(label)) {
                return btn.getAttribute("class").contains("strength-range-btn-active");
            }
        }
        return false;
    }

    // ── Cardio ───────────────────────────────────────────────────────────────

    public boolean isCardioHeaderVisible() {
        return !driver.findElements(CARDIO_HEADER).isEmpty();
    }

    public boolean isCardioSidebarVisible() {
        return !driver.findElements(CARDIO_SIDEBAR).isEmpty();
    }

    public boolean isCardioEmptyStateVisible() {
        return !driver.findElements(CARDIO_EMPTY).isEmpty();
    }

    public int getCardioExerciseCount() {
        return driver.findElements(CARDIO_SIDEBAR_ITEMS).size();
    }

    public void clickCardioExercise(String name) {
        for (WebElement btn : driver.findElements(CARDIO_SIDEBAR_ITEMS)) {
            if (btn.findElement(By.cssSelector(".cardio-sidebar-item-name")).getText().equals(name)) {
                btn.click();
                return;
            }
        }
        throw new AssertionError("Cardio exercise '" + name + "' not in sidebar");
    }
}
