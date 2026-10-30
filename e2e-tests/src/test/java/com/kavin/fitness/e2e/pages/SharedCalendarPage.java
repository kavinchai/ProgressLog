package com.kavin.fitness.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;

public class SharedCalendarPage {
    private final Page page;

    private static final String SUBNAV_LEADERBOARD = "[role='group'][aria-label='View'] button:has-text(\"Leaderboard\")";
    private static final String SUBNAV_CALENDAR    = "[role='group'][aria-label='View'] button:has-text(\"Calendar\")";
    private static final String VIEW_TAB_WEEK      = "[role='group'][aria-label='Calendar range'] button:has-text(\"Week\")";
    private static final String VIEW_TAB_MONTH     = "[role='group'][aria-label='Calendar range'] button:has-text(\"Month\")";
    private static final String GRID               = ".sc-grid";
    // The day panel (open on today by default on desktop) lists one row per lifter.
    private static final String DAY_ROW            = ".sc-side .sc-row";
    private static final String DAY_USER           = ".sc-side .sc-row-name";
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
        page.navigate(baseUrl + "/community");
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

    // :text-is matches the name's own text, so the signed-in user's row
    // ("qaf-test" + a "You" tag) still matches "qaf-test".
    private Locator userRow(String username) {
        return page.locator(DAY_USER + ":text-is(\"" + username + "\")");
    }

    /** Waits up to 5s for the username to be listed in the open day's panel (today by default). */
    public boolean isUsernameOnCalendar(String username) {
        try {
            userRow(username).first().waitFor(new Locator.WaitForOptions().setTimeout(5000));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** True once the day panel has rendered and does not list the username. */
    public boolean isUsernameAbsentFromCalendar(String username) {
        page.locator(".sc-side").waitFor(new Locator.WaitForOptions().setTimeout(5000));
        return userRow(username).count() == 0;
    }

    /** Opens the lifter's row in the day panel to show their sets. */
    public void expandRow(String username) {
        page.locator(DAY_ROW, new Page.LocatorOptions().setHas(userRow(username)))
                .locator(".sc-row-button").click();
    }

    /** Waits up to 5s for a set line, e.g. "5 reps @ 95 lbs", in the day panel. */
    public boolean isSetLineVisible(String text) {
        try {
            page.locator(".sc-side .sc-detail-sets li:has-text(\"" + text + "\")").first()
                    .waitFor(new Locator.WaitForOptions().setTimeout(5000));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** True if the session name is shown as a lifter's activity in the open day's panel. */
    public boolean isSessionNameOnCalendar(String sessionName) {
        try {
            page.locator(".sc-side .sc-row-label:has-text(\"" + sessionName + "\")")
                    .first().waitFor(new Locator.WaitForOptions().setTimeout(5000));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public int dayEntryCount() {
        return page.locator(DAY_ROW).count();
    }

    public boolean isEmptyStateVisible() {
        return awaitVisible(EMPTY);
    }
}
