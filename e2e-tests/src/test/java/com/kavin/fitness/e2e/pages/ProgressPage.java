package com.kavin.fitness.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.WaitForSelectorState;

import java.util.List;

public class ProgressPage {
    private final Page page;

    private static final String PAGE_TABS = ".page-tabs .page-tab";
    private static final String ACTIVE_TAB = ".page-tabs .page-tab-active";
    private static final String STRENGTH_HEADER = ".strength-header h1";
    private static final String CARDIO_HEADER = ".cardio-header h1";
    private static final String STRENGTH_SIDEBAR = "[data-testid='strength-sidebar']";
    private static final String CARDIO_SIDEBAR = "[data-testid='cardio-sidebar']";
    private static final String STRENGTH_SIDEBAR_ITEMS = ".strength-sidebar-item";
    private static final String CARDIO_SIDEBAR_ITEMS = ".cardio-sidebar-item";
    private static final String STRENGTH_RANGE_BTNS = ".strength-range-btn";
    private static final String SESSION_TABLE = "[data-testid='session-history-table']";
    private static final String STRENGTH_EMPTY = ".strength-empty";
    private static final String CARDIO_EMPTY = ".cardio-empty";
    private static final String LOADING = ".loading-state";

    public ProgressPage(Page page) {
        this.page = page;
    }

    public void openStrength(String baseUrl) {
        page.navigate(baseUrl + "/progress/strength");
        waitForLoaded();
    }

    public void openCardio(String baseUrl) {
        page.navigate(baseUrl + "/progress/cardio");
        waitForLoaded();
    }

    private void waitForLoaded() {
        Locator loading = page.locator(LOADING);
        if (loading.count() > 0) {
            loading.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.HIDDEN));
        }
    }

    public List<String> getTabLabels() {
        return page.locator(PAGE_TABS).allInnerTexts();
    }

    public String getActiveTabLabel() {
        Locator el = page.locator(ACTIVE_TAB);
        return el.count() == 0 ? "" : el.first().innerText();
    }

    public void clickTab(String label) {
        page.locator("nav.page-tabs a", new Page.LocatorOptions().setHasText(label)).click();
        waitForLoaded();
    }

    // ── Strength ─────────────────────────────────────────────────────────────

    public boolean isStrengthHeaderVisible() {
        return page.locator(STRENGTH_HEADER).count() > 0;
    }

    public boolean isStrengthSidebarVisible() {
        return page.locator(STRENGTH_SIDEBAR).count() > 0;
    }

    public boolean isStrengthEmptyStateVisible() {
        return page.locator(STRENGTH_EMPTY).count() > 0;
    }

    public int getStrengthExerciseCount() {
        return page.locator(STRENGTH_SIDEBAR_ITEMS).count();
    }

    public void clickStrengthExercise(String name) {
        Locator item = page.locator(STRENGTH_SIDEBAR_ITEMS, new Page.LocatorOptions().setHas(
                page.locator(".strength-sidebar-item-name", new Page.LocatorOptions().setHasText(name))));
        if (item.count() == 0) {
            throw new AssertionError("Strength exercise '" + name + "' not in sidebar");
        }
        item.first().click();
    }

    public boolean isStrengthExerciseActive(String name) {
        Locator item = page.locator(STRENGTH_SIDEBAR_ITEMS, new Page.LocatorOptions().setHas(
                page.locator(".strength-sidebar-item-name", new Page.LocatorOptions().setHasText(name))));
        if (item.count() == 0) return false;
        String classes = item.first().getAttribute("class");
        return classes != null && classes.contains("strength-sidebar-item-active");
    }

    public boolean isSessionTableVisible() {
        return page.locator(SESSION_TABLE).count() > 0;
    }

    public int getSessionRowCount() {
        return page.locator("[data-testid='session-history-table'] tbody tr").count();
    }

    public String getCurrentMaxValue() {
        Locator el = page.locator("[data-testid='stat-current-max'] .strength-stat-value");
        return el.count() == 0 ? "" : el.first().innerText();
    }

    public boolean hasPRRow() {
        return page.locator(".strength-pr-row").count() > 0;
    }

    public boolean hasPRBadge() {
        return page.locator(".strength-pr-tag").count() > 0;
    }

    public void clickStrengthRange(String label) {
        Locator btn = page.locator(STRENGTH_RANGE_BTNS, new Page.LocatorOptions().setHasText(label));
        if (btn.count() == 0) {
            throw new AssertionError("Strength range '" + label + "' not found");
        }
        btn.first().click();
    }

    public boolean isStrengthRangeActive(String label) {
        Locator btn = page.locator(STRENGTH_RANGE_BTNS, new Page.LocatorOptions().setHasText(label));
        if (btn.count() == 0) return false;
        String classes = btn.first().getAttribute("class");
        return classes != null && classes.contains("strength-range-btn-active");
    }

    // ── Cardio ───────────────────────────────────────────────────────────────

    public boolean isCardioHeaderVisible() {
        return page.locator(CARDIO_HEADER).count() > 0;
    }

    public boolean isCardioSidebarVisible() {
        return page.locator(CARDIO_SIDEBAR).count() > 0;
    }

    public boolean isCardioEmptyStateVisible() {
        return page.locator(CARDIO_EMPTY).count() > 0;
    }

    public int getCardioExerciseCount() {
        return page.locator(CARDIO_SIDEBAR_ITEMS).count();
    }

    public void clickCardioExercise(String name) {
        Locator item = page.locator(CARDIO_SIDEBAR_ITEMS, new Page.LocatorOptions().setHas(
                page.locator(".cardio-sidebar-item-name", new Page.LocatorOptions().setHasText(name))));
        if (item.count() == 0) {
            throw new AssertionError("Cardio exercise '" + name + "' not in sidebar");
        }
        item.first().click();
    }
}
