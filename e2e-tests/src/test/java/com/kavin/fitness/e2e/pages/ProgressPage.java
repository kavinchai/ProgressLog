package com.kavin.fitness.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import com.microsoft.playwright.options.WaitForSelectorState;

public class ProgressPage {
    private final Page page;

    private static final String STRENGTH_HEADER = ".strength-header h1";
    private static final String PAGE_TABS = "nav.page-tabs";
    private static final String RANGE_BTNS = "[aria-label='Time range'] .strength-range-btn";
    private static final String SESSION_TABLE = "[data-testid='session-history-table']";
    private static final String LOADING = ".loading-state";

    public ProgressPage(Page page) {
        this.page = page;
    }

    private boolean awaitVisible(Locator locator) {
        try {
            locator.first().waitFor(new Locator.WaitForOptions().setTimeout(5000));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean awaitVisible(String selector) {
        return awaitVisible(page.locator(selector));
    }

    public void openStrength(String baseUrl) {
        page.navigate(baseUrl + "/progress/strength");
        waitForLoaded();
    }

    public void reload() {
        page.reload();
        waitForLoaded();
    }

    private void waitForLoaded() {
        Locator loading = page.locator(LOADING);
        if (loading.count() > 0) {
            loading.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.HIDDEN));
        }
    }

    public String currentPath() {
        return java.net.URI.create(page.url()).getPath();
    }

    public boolean isStrengthHeaderVisible() {
        return awaitVisible(STRENGTH_HEADER);
    }

    /** The lift view (not the empty state) rendered: the Choose lifts button is there. */
    public boolean isLiftViewVisible() {
        return awaitVisible(page.getByRole(AriaRole.BUTTON,
                new Page.GetByRoleOptions().setName("Choose lifts")));
    }

    /** True when the old Strength / Cardio sub-tabs are on the page. */
    public boolean hasProgressTabs() {
        return page.locator(PAGE_TABS).count() > 0
                || page.getByRole(AriaRole.LINK,
                        new Page.GetByRoleOptions().setName("Cardio").setExact(true)).count() > 0;
    }

    // ── Choose lifts dialog ──────────────────────────────────────────────────

    private Locator chooser() {
        return page.getByRole(AriaRole.DIALOG, new Page.GetByRoleOptions().setName("Choose lifts"));
    }

    public void openChooser() {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Choose lifts")).click();
        chooser().waitFor();
    }

    public void searchChooser(String text) {
        chooser().getByRole(AriaRole.SEARCHBOX, new Locator.GetByRoleOptions().setName("Search exercises"))
                .fill(text);
    }

    /** Ticks the lift's checkbox (no-op if already ticked). */
    public void chooseLift(String name) {
        chooser().getByRole(AriaRole.CHECKBOX, new Locator.GetByRoleOptions().setName(name)).check();
    }

    public void confirmChooser() {
        chooser().getByRole(AriaRole.BUTTON, new Locator.GetByRoleOptions().setName("Done")).click();
        chooser().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.HIDDEN));
    }

    // ── Lift cards ───────────────────────────────────────────────────────────

    private Locator liftCard(String name) {
        return page.locator("[data-testid='lift-grid'] .lift-card[aria-label='" + name + "']");
    }

    public boolean isLiftCardVisible(String name) {
        return awaitVisible(liftCard(name));
    }

    public void clickLiftCard(String name) {
        liftCard(name).click();
    }

    /** Waits for the lift's card to be the selected one (detail shows that lift). */
    public boolean isLiftCardActive(String name) {
        return awaitVisible(page.locator(
                "[data-testid='lift-grid'] .lift-card[aria-label='" + name + "'][aria-pressed='true']"))
                && awaitVisible(page.locator(".strength-detail-head h2",
                        new Page.LocatorOptions().setHasText(name)));
    }

    // ── Detail ───────────────────────────────────────────────────────────────

    public boolean isSessionTableVisible() {
        return awaitVisible(SESSION_TABLE);
    }

    public int getSessionRowCount() {
        return page.locator(SESSION_TABLE + " tbody tr").count();
    }

    public String getCurrentMaxValue() {
        Locator el = page.locator("[data-testid='stat-current-max'] .strength-stat-value");
        return el.count() == 0 ? "" : el.first().innerText();
    }

    public boolean hasPRRow() {
        return awaitVisible(".strength-pr-row");
    }

    public boolean hasPRBadge() {
        return awaitVisible(".strength-cell-weight .strength-pr-tag");
    }

    public void clickStrengthRange(String label) {
        Locator btn = page.locator(RANGE_BTNS, new Page.LocatorOptions().setHasText(label));
        if (btn.count() == 0) {
            throw new AssertionError("Strength range '" + label + "' not found");
        }
        btn.first().click();
    }

    public boolean isStrengthRangeActive(String label) {
        Locator btn = page.locator(RANGE_BTNS, new Page.LocatorOptions().setHasText(label));
        return btn.count() > 0 && "true".equals(btn.first().getAttribute("aria-pressed"));
    }
}
