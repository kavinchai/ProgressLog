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
        nav = new NavigationPage(driver);
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
        assertContains(labels, "Templates");
        assertContains(labels, "Settings");
    }

    @Test(priority = 2)
    public void todayLinkIsActiveOnTodayPage() {
        step("navigate to /today and verify active link");
        driver.get(baseUrl + "/today");
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
    public void navigateToTemplatesViaLink() {
        step("click Templates in sidebar");
        nav.clickSidebarLink("Templates");
        nav.waitForUrlContains("/templates");
        waitForPageLoad();

        step("verify Templates link is active");
        String active = nav.getActiveLinkLabel();
        if (!"Templates".equals(active)) {
            throw new AssertionError("Expected active link 'Templates' but got: " + active);
        }
    }

    @Test(priority = 5)
    public void sidebarDisplaysUsername() {
        step("verify sidebar shows a username");
        nav.waitForSidebar();
        String username = nav.getDisplayedUsername();
        if (username == null || username.trim().isEmpty()) {
            throw new AssertionError("Expected sidebar to display a username");
        }
    }

    @Test(priority = 6)
    public void darkModeToggleChangesLabel() {
        step("check initial dark mode button text");
        String initial = nav.getDarkModeButtonText();
        boolean startedDark = "Light Mode".equals(initial);

        step("click dark mode toggle");
        nav.clickDarkModeToggle();

        step("verify button text toggled");
        String after = nav.getDarkModeButtonText();
        if (startedDark) {
            if (!"Dark Mode".equals(after)) {
                throw new AssertionError("Expected 'Dark Mode' after toggle but got: " + after);
            }
        } else {
            if (!"Light Mode".equals(after)) {
                throw new AssertionError("Expected 'Light Mode' after toggle but got: " + after);
            }
        }

        step("toggle back to original");
        nav.clickDarkModeToggle();
    }

    private void assertContains(List<String> list, String expected) {
        if (!list.contains(expected)) {
            throw new AssertionError("Expected sidebar to contain '" + expected + "' but got: " + list);
        }
    }
}
