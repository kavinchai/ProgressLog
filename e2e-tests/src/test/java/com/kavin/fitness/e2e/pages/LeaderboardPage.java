package com.kavin.fitness.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.WaitForSelectorState;

public class LeaderboardPage {
    private final Page page;

    private static final String PAGE = ".lb-page";
    private static final String HERO_TITLE = ".lb-hero h1";
    private static final String LOADING = ".lb-loading";
    private static final String EX_TABS = ".lb-ex-tab";
    private static final String ACTIVE_EX_TAB = ".lb-ex-tab-active";
    private static final String EMPTY = ".lb-empty";

    public LeaderboardPage(Page page) {
        this.page = page;
    }

    public void open(String baseUrl) {
        page.navigate(baseUrl + "/leaderboard");
        page.locator(PAGE).waitFor();
        // Loading spinner may never appear if data is cached; tolerate either.
        Locator loading = page.locator(LOADING);
        if (loading.count() > 0) {
            loading.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.HIDDEN));
        }
    }

    public boolean isHeroVisible() {
        return page.locator(HERO_TITLE).count() > 0;
    }

    public String getHeroTitle() {
        return page.locator(HERO_TITLE).innerText();
    }

    public boolean hasExerciseTabs() {
        return page.locator(EX_TABS).count() > 0;
    }

    public String getActiveExerciseTabLabel() {
        Locator active = page.locator(ACTIVE_EX_TAB);
        return active.count() == 0 ? "" : active.first().innerText();
    }

    public void clickExerciseTab(String label) {
        page.locator(EX_TABS, new Page.LocatorOptions().setHasText(label)).first().click();
    }

    /** Leaderboard requires opted-in users — for a fresh test user this is empty. */
    public boolean isEmptyMessageVisible() {
        return page.locator(EMPTY).count() > 0;
    }
}
