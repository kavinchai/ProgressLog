package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.NavigationPage;
import com.kavin.fitness.e2e.support.BaseTest;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import java.util.List;

public class NavigationTest extends BaseTest {
    private NavigationPage nav;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        nav = new NavigationPage(page);
        navigateToToday();
    }

    @Test(priority = 1)
    public void sidebarShowsAllNavLinks() {
        step("verify sidebar contains expected links");
        nav.waitForSidebar();
        List<String> labels = nav.getSidebarLinkLabels();
        assertContains(labels, "Today");
        assertContains(labels, "History");
        assertContains(labels, "Progress");
        assertContains(labels, "Settings");
    }

    @Test(priority = 2)
    public void todayLinkIsActiveOnTodayPage() {
        step("navigate to /today and verify active link");
        page.navigate(baseUrl + "/today");
        waitForPageLoad();
        nav.waitForSidebar();
        String active = nav.getActiveLinkLabel();
        if (!"Today".equals(active)) {
            throw new AssertionError("Expected active link 'Today' but got: " + active);
        }
    }

    @Test(priority = 3)
    public void navigateToSettingsViaLink() {
        step("click Settings in sidebar");
        nav.clickSidebarLink("Settings");
        nav.waitForUrlContains("/settings");
        waitForPageLoad();

        step("verify Settings link is active");
        String active = nav.getActiveLinkLabel();
        if (!"Settings".equals(active)) {
            throw new AssertionError("Expected active link 'Settings' but got: " + active);
        }
    }

    @Test(priority = 4)
    public void sidebarDisplaysUsername() {
        step("verify sidebar shows a username");
        nav.waitForSidebar();
        String username = nav.getDisplayedUsername();
        if (username == null || username.trim().isEmpty()) {
            throw new AssertionError("Expected sidebar to display a username");
        }
    }

    private void assertContains(List<String> list, String expected) {
        if (!list.contains(expected)) {
            throw new AssertionError("Expected sidebar to contain '" + expected + "' but got: " + list);
        }
    }
}
