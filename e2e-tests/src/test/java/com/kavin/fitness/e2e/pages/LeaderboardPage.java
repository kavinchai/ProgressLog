package com.kavin.fitness.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;

public class LeaderboardPage {
    private final Page page;

    private static final String PAGE = ".lb-page";
    private static final String TITLE = ".lb-title";
    private static final String LOADED = ".lb-table, .lb-empty";
    private static final String LIFT_CHOICES = "[role='group'][aria-label='Lift'] button";
    private static final String PERIOD = "[role='group'][aria-label='Period']";
    private static final String EMPTY = ".lb-empty";

    public LeaderboardPage(Page page) {
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
        page.locator(PAGE).waitFor();
        waitForLoaded();
    }

    /** Waits for the board (or an empty / error message) instead of the loading text. */
    public void waitForLoaded() {
        page.locator(LOADED).first().waitFor();
    }

    /** Shows the given lift's board when it has one; no-op when it doesn't. */
    public void chooseLift(String name) {
        Locator chip = page.locator("[role='group'][aria-label='Lift']").getByRole(AriaRole.BUTTON,
                new Locator.GetByRoleOptions().setName(name).setExact(true));
        if (chip.count() == 0) return;
        chip.click();
        page.locator("[role='group'][aria-label='Lift'] button[aria-pressed='true']:has-text(\"" + name + "\")")
                .waitFor();
    }

    public boolean isTitleVisible() {
        return awaitVisible(TITLE);
    }

    public String getTitle() {
        return page.locator(TITLE).innerText();
    }

    public boolean hasLiftChoices() {
        return awaitVisible(LIFT_CHOICES);
    }

    public boolean hasPeriodSwitch() {
        return awaitVisible(PERIOD);
    }

    public String getActivePeriod() {
        return page.locator(PERIOD + " button[aria-pressed='true']").innerText();
    }

    public void choosePeriod(String label) {
        page.locator(PERIOD).getByRole(AriaRole.BUTTON,
                new Locator.GetByRoleOptions().setName(label).setExact(true)).click();
    }

    public void waitForActivePeriod(String label) {
        page.locator(PERIOD + " button[aria-pressed='true']:has-text(\"" + label + "\")").waitFor();
    }

    /** Leaderboard requires opted-in users — for a fresh test user this is empty. */
    public boolean isEmptyMessageVisible() {
        return awaitVisible(EMPTY);
    }

    private Locator boardRow(String username) {
        return page.locator(".lb-table .lb-name").getByText(username,
                new Locator.GetByTextOptions().setExact(true));
    }

    /** True if the username is a row on the current lift's board right now (call after waitForLoaded). */
    public boolean isUsernameOnBoard(String username) {
        return boardRow(username).count() > 0;
    }

    /** Waits up to 5s for the username to appear on the current lift's board. */
    public boolean awaitUsernameOnBoard(String username) {
        try {
            boardRow(username).first().waitFor(new Locator.WaitForOptions().setTimeout(5000));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** Returns the total lifter count shown in the stats banner, or 0 if not present. */
    public int getTotalUsersCount() {
        Locator stats = page.locator(".lb-stat-value");
        if (stats.count() == 0) return 0;
        try {
            return Integer.parseInt(stats.first().innerText().replace(",", ""));
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
