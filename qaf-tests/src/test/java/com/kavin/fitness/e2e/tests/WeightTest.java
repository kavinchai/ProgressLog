package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.TodayPage;
import com.kavin.fitness.e2e.pages.WeightModal;
import com.kavin.fitness.e2e.support.BaseTest;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

public class WeightTest extends BaseTest {
    private TodayPage today;
    private WeightModal modal;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        today = new TodayPage(driver);
        modal = new WeightModal(driver);
        navigateToToday();
    }

    @Test(priority = 1)
    public void addNewWeightEntry() {
        step("click Add Weight");
        today.clickAddWeight();

        step("modal opens with title 'Log Weight'");
        modal.waitUntilVisibleWithTitle("Log Weight");

        step("enter weight 185 and save");
        modal.enterWeight("185");
        modal.save();

        step("weight displays '185 lbs' on page");
        waitForModalClosed();
        today.waitForWeightValue("185 lbs");
    }

    @Test(priority = 2, dependsOnMethods = "addNewWeightEntry")
    public void editExistingWeightEntry() {
        step("click Edit Weight");
        today.clickEditWeight();

        step("modal opens with title 'Edit Weight' and value 185");
        modal.waitUntilVisibleWithTitle("Edit Weight");
        if (!"185".equals(modal.getInputValue())) {
            throw new AssertionError("Expected '185' but got: " + modal.getInputValue());
        }

        step("enter weight 186.5 and save");
        modal.enterWeight("186.5");
        modal.save();

        step("weight displays '186.5 lbs' on page");
        waitForModalClosed();
        today.waitForWeightValue("186.5 lbs");
    }
}
