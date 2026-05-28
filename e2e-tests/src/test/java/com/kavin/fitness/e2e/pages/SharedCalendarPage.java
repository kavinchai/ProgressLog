package com.kavin.fitness.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;

public class SharedCalendarPage {
    private final Page page;

    private static final String SUBNAV_LEADERBOARD = "button.lb-subnav-btn:has-text(\"Leaderboard\")";
    private static final String SUBNAV_CALENDAR    = "button.lb-subnav-btn:has-text(\"Shared Calendar\")";
    private static final String VIEW_TAB_WEEK      = ".sc-view-tabs button:has-text(\"Week\")";
    private static final String VIEW_TAB_MONTH     = ".sc-view-tabs button:has-text(\"Month\")";
    private static final String GRID               = ".calendar-grid";
    private static final String DAY_ENTRY          = ".sc-day-entry";
    private static final String DAY_USER           = ".sc-day-user";
    private static final String EMPTY              = ".sc-empty";

    public SharedCalendarPage(Page page) {
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

    public void open(String baseUrl) {
        page.navigate(baseUrl + "/leaderboard");
        page.locator(".lb-page").waitFor();
    }

    public boolean hasSubnav() {
        return awaitVisible(SUBNAV_LEADERBOARD) && awaitVisible(SUBNAV_CALENDAR);
    }

    public void clickSharedCalendarTab() {
        page.locator(SUBNAV_CALENDAR).click();
    }

    public void clickLeaderboardTab() {
        page.locator(SUBNAV_LEADERBOARD).click();
    }

    public void clickWeekView() {
        page.locator(VIEW_TAB_WEEK).click();
    }

    public void clickMonthView() {
        page.locator(VIEW_TAB_MONTH).click();
    }

    /** True once either the calendar grid or the empty-state is visible. */
    public boolean awaitCalendarVisible() {
        try {
            page.locator(GRID + ", " + EMPTY).first().waitFor(
                    new Locator.WaitForOptions().setTimeout(5000));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** Returns true if the given username appears on at least one day-cell entry. */
    public boolean isUsernameOnCalendar(String username) {
        return page.locator(DAY_USER + ":has-text(\"" + username + "\")").count() > 0;
    }

    public int dayEntryCount() {
        return page.locator(DAY_ENTRY).count();
    }

    public boolean isEmptyStateVisible() {
        return awaitVisible(EMPTY);
    }
}
