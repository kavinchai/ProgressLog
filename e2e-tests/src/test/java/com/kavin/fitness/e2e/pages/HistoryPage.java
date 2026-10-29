package com.kavin.fitness.e2e.pages;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import com.microsoft.playwright.options.WaitForSelectorState;

public class HistoryPage {
    private final Page page;

    private static final String PAGE_TABS = ".page-tabs .page-tab";
    private static final String ACTIVE_TAB = ".page-tabs .page-tab-active";
    private static final String WEEKLY_TITLE = ".weekly-page .history-title";
    private static final String TOTAL_TITLE = ".total-page .history-title";
    private static final String DAY_CARDS = ".week-strip .week-day";
    private static final String DAY_PANEL = "section[aria-label='Selected day']";
    private static final String CALENDAR_CELLS = "[data-testid^='calendar-day-']";
    private static final String MONTH_NAV = ".month-nav";
    private static final String MONTH_PICKER = ".month-picker";

    public HistoryPage(Page page) {
        this.page = page;
    }

    private boolean awaitVisible(String selector) {
        return awaitVisible(page.locator(selector).first());
    }

    private boolean awaitVisible(Locator locator) {
        try {
            locator.waitFor(new Locator.WaitForOptions().setTimeout(5000));
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

    private Locator button(String name) {
        return page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName(name));
    }

    // ── Weekly ───────────────────────────────────────────────────────────────

    public boolean isWeekStripVisible() {
        return awaitVisible(DAY_CARDS);
    }

    public int getDayCardCount() {
        return page.locator(DAY_CARDS).count();
    }

    /** Today's card is outlined and selected by default. */
    public boolean isTodaySelected() {
        Locator today = page.locator(".week-strip .week-day--today");
        return awaitVisible(today) && "true".equals(today.getAttribute("aria-pressed"));
    }

    public void clickFirstDayCard() {
        page.locator(DAY_CARDS).first().click();
    }

    public void clickTodayCard() {
        page.locator(".week-strip .week-day--today").click();
    }

    public void clickAddExerciseInDayPanel() {
        page.locator(DAY_PANEL + " button:has-text(\"+ Add exercise\")").click();
    }

    public boolean dayPanelContains(String text) {
        return awaitVisible(DAY_PANEL + " :text(\"" + text + "\")");
    }

    /** Waits until the selected-day panel's header reads e.g. "Wed 10/28". */
    public void waitForDayPanelTitle(String title) {
        assertThat(page.locator(DAY_PANEL + " .history-day-panel-title")).hasText(title);
    }

    public boolean isChartVisible(String title) {
        return awaitVisible("section.history-chart-card[aria-label='" + title + "']");
    }

    public void clickPreviousWeek() {
        button("Previous week").click();
    }

    public void clickNextWeek() {
        button("Next week").click();
    }

    /** Waits (retrying) until the Next week button is enabled or disabled. */
    public void waitForNextWeekEnabled(boolean enabled) {
        if (enabled) {
            assertThat(button("Next week")).isEnabled();
        } else {
            assertThat(button("Next week")).isDisabled();
        }
    }

    private Locator thisWeekPill() {
        return page.locator(".weekly-page .history-pill",
                new Page.LocatorOptions().setHasText("This week"));
    }

    public void waitForThisWeekPill() {
        thisWeekPill().waitFor();
    }

    public void waitForThisWeekPillHidden() {
        thisWeekPill().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.HIDDEN));
    }

    // ── Total ────────────────────────────────────────────────────────────────

    public boolean isCalendarVisible() {
        return awaitVisible(CALENDAR_CELLS);
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

    public String calendarDayLabel(String isoDate) {
        return page.locator("[data-testid='calendar-day-" + isoDate + "']").getAttribute("aria-label");
    }

    /** Waits until a calendar day's accessible label contains {@code text}. */
    public void waitForCalendarDayLabel(String isoDate, String text) {
        page.locator("[data-testid='calendar-day-" + isoDate + "'][aria-label*='" + text + "']")
                .waitFor();
    }

    public void selectHeatmapMetric(String metric) {
        page.locator("[aria-label='Color days by'] button", new Page.LocatorOptions().setHasText(metric))
                .click();
    }

    public void closeDayPanel() {
        button("Close day").click();
    }

    // ── Phone layout (≤640px) ───────────────────────────────────────────────

    public void clickDayCard(String shortDate) {
        page.locator(DAY_CARDS + "[aria-label='" + shortDate + "']").click();
    }

    /** Weekly on phones shows one chart at a time, picked by this switch. */
    public void selectWeeklyChart(String label) {
        page.locator("[aria-label='Chart'] button", new Page.LocatorOptions().setHasText(label))
                .click();
    }

    public void waitForChartShown(String title) {
        assertThat(page.locator("section.history-chart-card[aria-label='" + title + "']"))
                .isVisible();
    }

    public void waitForChartHidden(String title) {
        assertThat(page.locator("section.history-chart-card[aria-label='" + title + "']"))
                .isHidden();
    }

    /** Total on phones picks the heatmap metric with a dropdown. */
    public void selectHeatmapMetricOnPhone(String value) {
        page.getByRole(AriaRole.COMBOBOX, new Page.GetByRoleOptions().setName("Color days by"))
                .selectOption(value);
    }

    private Locator daySheet(String title) {
        return page.getByRole(AriaRole.DIALOG, new Page.GetByRoleOptions().setName(title));
    }

    public void waitForDaySheet(String title) {
        assertThat(daySheet(title)).isVisible();
    }

    public boolean daySheetContains(String title, String text) {
        return awaitVisible(daySheet(title).getByText(text).first());
    }

    public void clickPreviousDay() {
        button("Previous day").click();
    }

    public void waitForNextDayDisabled() {
        assertThat(button("Next day")).isDisabled();
    }

    public void closeDaySheet() {
        page.locator(".modal-box .modal-close").click();
        page.locator(".modal-box").waitFor(
                new Locator.WaitForOptions().setState(WaitForSelectorState.DETACHED));
    }

    public void clickMonthPickerToggle() {
        page.locator(".month-nav-label button").first().click();
    }

    public boolean isMonthPickerVisible() {
        return awaitVisible(MONTH_PICKER);
    }
}
