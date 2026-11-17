package com.kavin.fitness.e2e.tests;

import static org.testng.Assert.assertEquals;

import com.kavin.fitness.e2e.pages.TodayPage;
import com.kavin.fitness.e2e.support.BaseTest;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

public class StepsTest extends BaseTest {
    private TodayPage today;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        today = new TodayPage(page);
        navigateToToday();
    }

    @Test(priority = 1)
    public void addStepsForTheDay() {
        step("click + Add steps: Log Steps opens; enter 10000, save");
        today.clickAddSteps();
        today.waitForStepsSheet("Log Steps");
        today.enterSteps("10000");
        today.saveSteps();

        step("steps displays '10,000' on page");
        today.waitForStepsValue("10,000");
    }

    @Test(priority = 2, dependsOnMethods = "addStepsForTheDay")
    public void editExistingStepsCount() {
        step("tap the steps row: Edit Steps opens showing 10000; enter 12345, save");
        today.clickAddSteps();
        today.waitForStepsSheet("Edit Steps");
        assertEquals(today.getStepsInputValue(), "10000");
        today.enterSteps("12345");
        today.saveSteps();

        step("steps displays '12,345' on page");
        today.waitForStepsValue("12,345");
    }

    @Test(priority = 3, dependsOnMethods = "editExistingStepsCount")
    public void deleteStepsEntry() {
        step("click Delete Steps");
        today.clickDeleteSteps();

        step("steps row goes back to + Add");
        today.waitForNoSteps();
    }
}
