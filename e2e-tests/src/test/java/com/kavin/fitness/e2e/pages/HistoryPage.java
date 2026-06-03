package com.kavin.fitness.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;

public class HistoryPage {
    private final Page page;

    private static final String PAGE_TABS = ".page-tabs .page-tab";
    private static final String ACTIVE_TAB = ".page-tabs .page-tab-active";
    private static final String WEEKLY_TITLE = "span.weekly-title:has-text(\"Weekly\")";
    private static final String TOTAL_TITLE = "span.weekly-title:has-text(\"Total\")";
    private static final String WEEKLY_TABLE = ".weekly-table";
    private static final String WEEKLY_ROWS = ".weekly-table tbody .weekly-row";
    private static final String TODAY_ROW = ".weekly-table tbody .today-row";
    private static final String CALENDAR = ".calendar-grid";
    private static final String CALENDAR_CELLS = ".calendar-cell:not(.calendar-cell-pad)";
    private static final String MONTH_NAV = ".month-nav";
    private static final String MONTH_PICKER = ".month-picker";
    private static final String DAY_MODAL_TITLE = ".modal-title";
    public HistoryPage(Page page) {
        this.page = page;
    }

    private boolean awaitVisible(String selector) {
        try {
            page.locator(selector).first().waitFor(
                    new Locator.WaitForOptions().setTimeout(5000));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public void openWeekly(String baseUrl) {
        page.navigate(baseUrl + "/history/weekly");
        page.locator(WEEKLY_TITLE).waitFor();
    }

    public void openTotal(String baseUrl) {
        page.navigate(baseUrl + "/history/total");
        page.locator(TOTAL_TITLE).waitFor();
    }

    public java.util.List<String> getTabLabels() {
        return page.locator(PAGE_TABS).allInnerTexts();
    }

    public String getActiveTabLabel() {
        Locator el = page.locator(ACTIVE_TAB);
        return el.count() == 0 ? "" : el.first().innerText();
    }

    public void clickTab(String label) {
        page.locator("nav.page-tabs a", new Page.LocatorOptions().setHasText(label)).click();
    }

    // ── Weekly ───────────────────────────────────────────────────────────────

    public boolean isWeeklyTableVisible() {
        return awaitVisible(WEEKLY_TABLE);
    }

    public int getWeeklyRowCount() {
        return page.locator(WEEKLY_ROWS).count();
    }

    public boolean hasTodayRow() {
        return awaitVisible(TODAY_ROW);
    }

    public void clickFirstWeeklyRow() {
        page.locator(WEEKLY_ROWS).first().click();
    }

    public void clickTodayRow() {
        page.locator(TODAY_ROW).first().click();
    }

    public void clickAddExerciseInExpandedDay() {
        page.locator("tr.detail-row button:has-text(\"+ Add exercise\")").click();
    }

    public boolean isExpandedRowVisible() {
        return awaitVisible(".weekly-table tbody .detail-row");
    }

    public boolean dayDetailContains(String text) {
        return awaitVisible("tr.detail-row :text(\"" + text + "\")");
    }

    // ── Total ────────────────────────────────────────────────────────────────

    public boolean isCalendarVisible() {
        return awaitVisible(CALENDAR);
    }

    public int getCalendarCellCount() {
        return page.locator(CALENDAR_CELLS).count();
    }

    public boolean isMonthNavVisible() {
        return awaitVisible(MONTH_NAV);
    }

    public void clickCalendarDay(String isoDate) {
        page.locator("[data-testid='calendar-day-" + isoDate + "']").click();
    }

    public void waitForDayModal() {
        page.locator(DAY_MODAL_TITLE).waitFor();
    }

    public boolean dayModalContains(String text) {
        return awaitVisible(".modal-box :text(\"" + text + "\")");
    }

    public void closeDayModal() {
        page.locator(".modal-box .modal-close").click();
    }

    public void clickMonthPickerToggle() {
        page.locator(".month-nav-label .btn").first().click();
    }

    public boolean isMonthPickerVisible() {
        return awaitVisible(MONTH_PICKER);
    }
}
