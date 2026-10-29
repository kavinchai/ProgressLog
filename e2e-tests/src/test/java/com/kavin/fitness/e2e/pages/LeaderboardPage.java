package com.kavin.fitness.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import com.microsoft.playwright.options.WaitForSelectorState;

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

    // ── Choose lifts dialog (signed in) ──────────────────────────────────────

    private Locator chooser() {
        return page.getByRole(AriaRole.DIALOG, new Page.GetByRoleOptions().setName("Choose lifts"));
    }

    public void openChooser() {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Choose lifts")).click();
        chooser().waitFor();
    }

    /** Ticks the lift's checkbox in the dialog (no-op if already ticked). */
    public void tickLiftInChooser(String name) {
        chooser().getByRole(AriaRole.CHECKBOX, new Locator.GetByRoleOptions().setName(name)).check();
    }

    /** Waits up to 5s for the lift to be listed in the dialog. */
    public boolean awaitLiftInChooser(String name) {
        try {
            chooser().getByRole(AriaRole.CHECKBOX, new Locator.GetByRoleOptions().setName(name))
                    .waitFor(new Locator.WaitForOptions().setTimeout(5000));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isLiftTickedInChooser(String name) {
        return chooser().getByRole(AriaRole.CHECKBOX, new Locator.GetByRoleOptions().setName(name)).isChecked();
    }

    public void cancelChooser() {
        chooser().getByRole(AriaRole.BUTTON, new Locator.GetByRoleOptions().setName("Cancel")).click();
        chooser().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.HIDDEN));
    }

    public void confirmChooser() {
        chooser().getByRole(AriaRole.BUTTON, new Locator.GetByRoleOptions().setName("Done")).click();
        chooser().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.HIDDEN));
    }

    private Locator liftChip(String name) {
        return page.locator("[role='group'][aria-label='Lift']").getByRole(AriaRole.BUTTON,
                new Locator.GetByRoleOptions().setName(name).setExact(true));
    }

    /** Waits up to 5s for the lift to be one of the board's lift chips. */
    public boolean awaitLiftChip(String name) {
        try {
            liftChip(name).waitFor(new Locator.WaitForOptions().setTimeout(5000));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** True if the lift is a chip right now (call after waitForLoaded). */
    public boolean hasLiftChip(String name) {
        return liftChip(name).count() > 0;
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
