package com.kavin.fitness.e2e.tests;

import static org.testng.Assert.assertEquals;

import com.kavin.fitness.e2e.pages.OfflineMode;
import com.kavin.fitness.e2e.pages.TodayPage;
import com.kavin.fitness.e2e.support.BaseTest;
import com.kavin.fitness.e2e.support.TestApiClient;
import java.time.LocalDate;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

/**
 * With no connection the app opens from the data it saved on the phone,
 * says it's offline, refuses to save with a clear message (keeping what you
 * typed) and saves once the connection is back.
 */
public class OfflineTest extends BaseTest {
    private TodayPage today;
    private OfflineMode offline;
    private TestApiClient api;
    private String todayDate;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        today = new TodayPage(page);
        offline = new OfflineMode(page);
        todayDate = LocalDate.now().toString();

        String apiUrl = System.getProperty("env.apiurl", "http://localhost:8080/api");
        String username = System.getProperty("test.user.username", "qaf-test");
        String password = System.getProperty("test.user.password", "qaf-test-password");
        api = new TestApiClient(apiUrl);
        api.login(username, password);
        api.deleteStepsOnDate(todayDate);
        api.deleteWeightOnDate(todayDate);
        api.logWeight(todayDate, 182.5);

        navigateToToday();
        today.waitForWeightValue("182.5");
    }

    @AfterClass(alwaysRun = true)
    public void cleanup() {
        try {
            offline.reconnect();
        } catch (Exception ignored) {}
        try {
            api.deleteStepsOnDate(todayDate);
            api.deleteWeightOnDate(todayDate);
        } catch (Exception ignored) {}
    }

    @Test(priority = 1)
    public void opensWithSavedDataWhenTheServerCantBeReached() {
        step("cut off the server and reload Today");
        offline.cutOffServer();
        page.reload();

        step("the offline banner shows and today's weight is still there");
        offline.waitForBanner("Offline · showing data from");
        today.waitForWeightValue("182.5");
    }

    @Test(priority = 2, dependsOnMethods = "opensWithSavedDataWhenTheServerCantBeReached")
    public void savingOfflineSaysSoAndKeepsWhatYouTyped() {
        step("+ Add steps, enter 8500, Save");
        today.clickAddSteps();
        today.waitForStepsSheet("Log Steps");
        today.enterSteps("8500");
        offline.pressSaveExpectingError("You're offline. Connect to save this.");

        step("the sheet stays open with 8500 still in it");
        assertEquals(today.getStepsInputValue(), "8500");
    }

    @Test(priority = 3, dependsOnMethods = "savingOfflineSaysSoAndKeepsWhatYouTyped")
    public void savesOnceTheConnectionIsBack() {
        step("reconnect and press Save again");
        offline.reconnect();
        today.saveSteps();

        step("the steps are saved and the banner goes away");
        today.waitForStepsValue("8,500");
        offline.waitForNoBanner();
    }
}
