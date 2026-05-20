package com.kavin.fitness.e2e.pages;

import com.kavin.fitness.e2e.support.Clicks;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.List;

public class HistoryPage {
    private final WebDriver driver;
    private final WebDriverWait wait;

    private static final By PAGE_TABS = By.cssSelector(".page-tabs .page-tab");
    private static final By ACTIVE_TAB = By.cssSelector(".page-tabs .page-tab-active");
    private static final By WEEKLY_TITLE = By.xpath(
            "//span[contains(@class,'weekly-title') and contains(text(),'Weekly')]");
    private static final By TOTAL_TITLE = By.xpath(
            "//span[contains(@class,'weekly-title') and contains(text(),'Total')]");
    private static final By WEEKLY_TABLE = By.cssSelector(".weekly-table");
    private static final By WEEKLY_ROWS = By.cssSelector(".weekly-table tbody .weekly-row");
    private static final By TODAY_ROW = By.cssSelector(".weekly-table tbody .today-row");
    private static final By CALENDAR = By.cssSelector(".calendar-grid");
    private static final By CALENDAR_CELLS = By.cssSelector(".calendar-cell:not(.calendar-cell-pad)");
    private static final By MONTH_NAV = By.cssSelector(".month-nav");
    private static final By MONTH_PICKER = By.cssSelector(".month-picker");
    private static final By DAY_MODAL_TITLE = By.cssSelector(".modal-title");
    private static final By RANGE_BUTTONS = By.cssSelector(".range-selector .btn");

    public HistoryPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public void openWeekly(String baseUrl) {
        driver.get(baseUrl + "/history/weekly");
        wait.until(ExpectedConditions.visibilityOfElementLocated(WEEKLY_TITLE));
    }

    public void openTotal(String baseUrl) {
        driver.get(baseUrl + "/history/total");
        wait.until(ExpectedConditions.visibilityOfElementLocated(TOTAL_TITLE));
    }

    public List<String> getTabLabels() {
        return driver.findElements(PAGE_TABS).stream().map(WebElement::getText).toList();
    }

    public String getActiveTabLabel() {
        List<WebElement> els = driver.findElements(ACTIVE_TAB);
        return els.isEmpty() ? "" : els.get(0).getText();
    }

    public void clickTab(String label) {
        WebElement tab = driver.findElement(By.xpath(
                "//nav[contains(@class,'page-tabs')]//a[text()='" + label + "']"));
        Clicks.js(driver, tab);
    }

    // ── Weekly ───────────────────────────────────────────────────────────────

    public boolean isWeeklyTableVisible() {
        return !driver.findElements(WEEKLY_TABLE).isEmpty();
    }

    public int getWeeklyRowCount() {
        return driver.findElements(WEEKLY_ROWS).size();
    }

    public boolean hasTodayRow() {
        return !driver.findElements(TODAY_ROW).isEmpty();
    }

    public void clickFirstWeeklyRow() {
        Clicks.js(driver, driver.findElements(WEEKLY_ROWS).get(0));
    }

    public boolean isExpandedRowVisible() {
        return !driver.findElements(By.cssSelector(".weekly-table tbody .detail-row")).isEmpty();
    }

    public boolean dayDetailContains(String text) {
        return !driver.findElements(By.xpath(
                "//tr[contains(@class,'detail-row')]//*[contains(text(),'" + text + "')]"))
                .isEmpty();
    }

    // ── Total ────────────────────────────────────────────────────────────────

    public boolean isCalendarVisible() {
        return !driver.findElements(CALENDAR).isEmpty();
    }

    public int getCalendarCellCount() {
        return driver.findElements(CALENDAR_CELLS).size();
    }

    public boolean isMonthNavVisible() {
        return !driver.findElements(MONTH_NAV).isEmpty();
    }

    public void clickCalendarDay(String isoDate) {
        WebElement cell = wait.until(ExpectedConditions.elementToBeClickable(
                By.cssSelector("[data-testid='calendar-day-" + isoDate + "']")));
        Clicks.js(driver, cell);
    }

    public void waitForDayModal() {
        wait.until(ExpectedConditions.visibilityOfElementLocated(DAY_MODAL_TITLE));
    }

    public boolean dayModalContains(String text) {
        return !driver.findElements(By.xpath(
                "//div[contains(@class,'modal-box')]//*[contains(text(),'" + text + "')]"))
                .isEmpty();
    }

    public void closeDayModal() {
        WebElement closeBtn = driver.findElement(By.cssSelector(".modal-box .modal-close"));
        closeBtn.click();
    }

    public boolean isRangeButtonVisible(String label) {
        return driver.findElements(RANGE_BUTTONS).stream()
                .anyMatch(el -> el.getText().equals(label));
    }

    public void clickRangeButton(String label) {
        for (WebElement btn : driver.findElements(RANGE_BUTTONS)) {
            if (btn.getText().equals(label)) {
                Clicks.js(driver, btn);
                return;
            }
        }
        throw new AssertionError("Range button '" + label + "' not found");
    }

    public boolean isRangeButtonActive(String label) {
        for (WebElement btn : driver.findElements(RANGE_BUTTONS)) {
            if (btn.getText().equals(label)) {
                return btn.getAttribute("class").contains("range-active");
            }
        }
        return false;
    }

    public void clickMonthPickerToggle() {
        WebElement label = driver.findElement(By.cssSelector(".month-nav-label .btn"));
        Clicks.js(driver, label);
    }

    public boolean isMonthPickerVisible() {
        return !driver.findElements(MONTH_PICKER).isEmpty();
    }
}
