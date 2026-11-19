package com.kavin.fitness.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import com.microsoft.playwright.options.WaitForSelectorState;

public class LeaderboardPage {
    private final Page page;

    private static final String PAGE = ".lb-page";
    // The public hero title, or the large "Community" title when signed in.
    private static final String TITLE = ".lb-title, .lb-page .ios-large-title";
    private static final String LOADED = ".lb-table, .lb-empty";
    // The board's title: a "Lift: …" menu when there's more than one lift.
    private static final String LIFT_CHOICES = ".lb-card-title";
    private static final String LIFT_MENU_BUTTON = "button.lb-lift-menu";
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
        Locator trigger = page.locator(LIFT_MENU_BUTTON);
        if (trigger.count() == 0) return;
        if (("Lift: " + name).equals(trigger.getAttribute("aria-label"))) return;
        trigger.click();
        Locator item = liftMenu().getByRole(AriaRole.MENUITEMRADIO,
                new Locator.GetByRoleOptions().setName(name).setExact(true));
        if (item.count() == 0) {
            page.keyboard().press("Escape");
            return;
        }
        item.click();
        page.locator(LIFT_MENU_BUTTON + "[aria-label='Lift: " + name + "']").waitFor();
    }

    private Locator liftMenu() {
        return page.getByRole(AriaRole.MENU, new Page.GetByRoleOptions().setName("Lift"));
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
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Edit lifts")).click();
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

    /**
     * True if the lift is one of the board's lifts right now: an item in the
     * "Lift" menu, or the board's title when only one lift is chosen.
     */
    public boolean hasLiftChip(String name) {
        Locator trigger = page.locator(LIFT_MENU_BUTTON);
        if (trigger.count() == 0) {
            Locator title = page.locator(LIFT_CHOICES);
            return title.count() > 0 && name.equals(title.first().innerText().trim());
        }
        trigger.click();
        boolean listed = liftMenu().getByRole(AriaRole.MENUITEMRADIO,
                new Locator.GetByRoleOptions().setName(name).setExact(true)).count() > 0;
        page.keyboard().press("Escape");
        return listed;
    }

    /** Waits up to 5s for the lift to be one of the board's lifts. */
    public boolean awaitLiftChip(String name) {
        long deadline = System.currentTimeMillis() + 5000;
        while (System.currentTimeMillis() < deadline) {
            if (hasLiftChip(name)) return true;
            page.waitForTimeout(250);
        }
        return false;
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
