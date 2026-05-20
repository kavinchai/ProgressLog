package com.kavin.fitness.e2e.pages;

import com.microsoft.playwright.Page;

import java.util.List;
import java.util.stream.Collectors;

public class NavigationPage {
    private final Page page;

    private static final String SIDEBAR_LINKS = ".sidebar-nav .sidebar-link";
    private static final String SIDEBAR_ACTIVE_LINK = ".sidebar-nav .sidebar-link.active";
    private static final String SIDEBAR_LOGO = ".sidebar-logo";
    private static final String SIDEBAR_LOGOUT = ".sidebar-logout";
    private static final String SIDEBAR_DARKMODE = ".sidebar-darkmode";
    private static final String SIDEBAR_USER = ".sidebar-user .muted";

    public NavigationPage(Page page) {
        this.page = page;
    }

    public void waitForSidebar() {
        page.locator(SIDEBAR_LOGO).waitFor();
    }

    public List<String> getSidebarLinkLabels() {
        return page.locator(SIDEBAR_LINKS).allInnerTexts().stream()
                .collect(Collectors.toList());
    }

    public String getActiveLinkLabel() {
        return page.locator(SIDEBAR_ACTIVE_LINK).innerText();
    }

    public void clickSidebarLink(String label) {
        page.locator("nav.sidebar-nav a", new Page.LocatorOptions().setHasText(label)).click();
    }

    public void waitForUrlContains(String path) {
        page.waitForURL(url -> url.contains(path));
    }

    public String getDisplayedUsername() {
        return page.locator(SIDEBAR_USER).innerText();
    }

    public String getDarkModeButtonText() {
        return page.locator(SIDEBAR_DARKMODE).innerText();
    }

    public void clickDarkModeToggle() {
        page.locator(SIDEBAR_DARKMODE).click();
    }

    public void clickLogout() {
        page.locator(SIDEBAR_LOGOUT).click();
    }
}
