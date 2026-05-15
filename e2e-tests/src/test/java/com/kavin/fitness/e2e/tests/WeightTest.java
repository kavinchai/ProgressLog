package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.TodayPage;
import com.kavin.fitness.e2e.pages.WeightModal;
import com.kavin.fitness.e2e.support.BaseTest;
import com.kavin.fitness.e2e.support.TestApiClient;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import java.time.LocalDate;

public class WeightTest extends BaseTest {
    private TodayPage today;
    private WeightModal modal;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        today = new TodayPage(driver);
        modal = new WeightModal(driver);

        // Ensure today has no weight entry before we start — addNewWeightEntry
        // expects the "+ Add" button, which the UI only renders when no entry
        // exists. Without this, any earlier test class that seeded today's
        // weight (e.g. HistoryPageTest) blocks this one.
        String apiUrl = System.getProperty("env.apiurl", "http://localhost:8080/api");
        String username = System.getProperty("test.user.username", "qaf-test");
        String password = System.getProperty("test.user.password", "qaf-test-password");
        TestApiClient api = new TestApiClient(apiUrl);
        api.login(username, password);
        api.deleteWeightOnDate(LocalDate.now().toString());

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
