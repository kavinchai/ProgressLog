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
        // Loading spinner may never appear if data is cached; tolerate either.
        Locator loading = page.locator(LOADING);
        if (loading.count() > 0) {
            loading.first().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.HIDDEN));
        }
    }

    public boolean isHeroVisible() {
        return awaitVisible(HERO_TITLE);
    }

    public String getHeroTitle() {
        return page.locator(HERO_TITLE).innerText();
    }

    public boolean hasExerciseTabs() {
        return awaitVisible(EX_TABS);
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
        return awaitVisible(EMPTY);
    }

    /** Returns true if the given username appears anywhere on the leaderboard (table or podium card). */
    public boolean isUsernameOnBoard(String username) {
        return page.locator(".lb-name:has-text(\"" + username + "\"), .lb-podium-user:has-text(\"" + username + "\")").count() > 0;
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
