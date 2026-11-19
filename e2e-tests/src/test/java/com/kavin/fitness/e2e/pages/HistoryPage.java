package com.kavin.fitness.e2e.pages;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import com.microsoft.playwright.options.WaitForSelectorState;

public class HistoryPage {
    private final Page page;

    // Week | Month segmented control under the large title.
    private static final String PAGE_TABS = "[role='group'][aria-label='History views'] button";
    private static final String ACTIVE_TAB = PAGE_TABS + "[aria-pressed='true']";
    // The date range above the tiles ("Nov 15 – 21"), which every Weekly layout renders.
    private static final String WEEKLY_TITLE = ".weekly-page .ios-period-title";
    // The month title button ("November 2026").
    private static final String TOTAL_TITLE = ".total-page .history-title-btn";
    private static final String DAY_CARDS = ".week-strip .week-day";
    private static final String DAY_PANEL = "section[aria-label='Selected day']";
    private static final String CALENDAR_CELLS = "[data-testid^='calendar-day-']";
    private static final String MONTH_NAV = ".total-page .ios-period-nav";
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

    /** The week's date range title ("Nov 15 – 21"), or "" if it isn't shown. */
    public String getWeeklyHeading() {
        Locator title = page.locator(WEEKLY_TITLE);
        return awaitVisible(title) ? title.innerText() : "";
    }

    /** True when the title's full text fits (not cut off with an ellipsis). */
    public boolean isWeeklyHeadingUntruncated() {
        return (Boolean) page.locator(WEEKLY_TITLE)
                .evaluate("el => el.scrollWidth <= el.clientWidth");
    }

    /**
     * True when the Total trend charts sit in one column, each below the last,
     * with no sideways scrolling.
     */
    public boolean areTotalTrendChartsStacked() {
        Locator charts = page.locator(".total-page .history-charts");
        charts.locator(".history-chart-card").first().waitFor();
        return (Boolean) charts.evaluate(
                "el => {"
                        + " const r = [...el.querySelectorAll('.history-chart-card')]"
                        + "   .map(c => c.getBoundingClientRect());"
                        + " return r.length === 3"
                        + "   && el.scrollWidth <= el.clientWidth"
                        + "   && r.every(b => Math.abs(b.left - r[0].left) < 1)"
                        + "   && r.every((b, i) => i === 0 || b.top >= r[i - 1].bottom);"
                        + " }");
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
        page.locator(PAGE_TABS, new Page.LocatorOptions().setHasText(label)).click();
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
        page.locator(DAY_PANEL + " .status-add-chip:text-is(\"Add exercise\")").click();
    }

    public boolean dayPanelContains(String text) {
        return awaitVisible(DAY_PANEL + " :text(\"" + text + "\")");
    }

    /** Waits until the selected-day panel's header reads e.g. "Wed 10/28". */
    public void waitForDayPanelTitle(String title) {
        // Weekly: the day's header above its card; Total: the panel's own title.
        assertThat(page.locator(DAY_PANEL + " .ios-section-header > span:first-child, "
                + DAY_PANEL + " .history-day-panel-title").first()).hasText(title);
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

    /** "This week · …" under the date range, shown only on the current week. */
    private Locator thisWeekPill() {
        return page.locator(".weekly-page .ios-period-sub",
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

    /** Total: the stat tiles pick what colors the calendar ("Steps", "Workouts", …). */
    public void selectHeatmapMetric(String metric) {
        page.locator("[role='group'][aria-label='Color days by'] button[aria-label='" + metric + "']")
                .click();
    }

    public void closeDayPanel() {
        button("Close day").click();
    }

    // ── Phone layout (≤640px) ───────────────────────────────────────────────

    public void clickDayCard(String shortDate) {
        page.locator(DAY_CARDS + "[aria-label='" + shortDate + "']").click();
    }

    /** Weekly shows one chart at a time, picked by tapping a stat tile. */
    public void selectWeeklyChart(String label) {
        page.locator("[role='group'][aria-label='Chart'] button[aria-label='" + label + "']")
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

    /**
     * Drags the open sheet's header down by {@code px}, like a finger. The
     * test browser has no touchscreen, so the touch events are dispatched.
     */
    public void dragDaySheetDown(int px) {
        page.locator(".modal-box .modal-header").evaluate(
                "(el, px) => {"
                        + "  const y0 = el.getBoundingClientRect().top + 10;"
                        + "  const fire = (type, y) => {"
                        + "    const t = new Touch({ identifier: 1, target: el, clientX: 100, clientY: y });"
                        + "    el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true,"
                        + "      touches: type === 'touchend' ? [] : [t], changedTouches: [t] }));"
                        + "  };"
                        + "  fire('touchstart', y0);"
                        + "  fire('touchmove', y0 + px / 2);"
                        + "  fire('touchmove', y0 + px);"
                        + "  fire('touchend', y0 + px);"
                        + "}",
                px);
    }

    public void waitForDaySheetClosed() {
        page.locator(".modal-box").waitFor(
                new Locator.WaitForOptions().setState(WaitForSelectorState.DETACHED));
    }

    public void clickMonthPickerToggle() {
        page.locator("button.history-title-btn").click();
    }

    public boolean isMonthPickerVisible() {
        return awaitVisible(MONTH_PICKER);
    }
}
