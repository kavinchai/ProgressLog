package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.HistoryPage;
import com.kavin.fitness.e2e.support.BaseTest;
import com.kavin.fitness.e2e.support.TestApiClient;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.Locale;

/**
 * The History pages at phone width (390×844): Weekly shows compact day
 * buttons and one chart at a time; Total picks its heatmap metric from a
 * dropdown and opens the selected day in a bottom sheet.
 */
public class HistoryMobileTest extends BaseTest {
    private HistoryPage history;
    private TestApiClient api;
    private String todayDate;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        history = new HistoryPage(page);
        todayDate = LocalDate.now().toString();

        String apiUrl = System.getProperty("env.apiurl", "http://localhost:8080/api");
        String username = System.getProperty("test.user.username", "qaf-test");
        String password = System.getProperty("test.user.password", "qaf-test-password");
        api = new TestApiClient(apiUrl);
        api.login(username, password);
        api.deleteStepsOnDate(todayDate);
        api.deleteWeightOnDate(todayDate);
        api.logSteps(todayDate, 8500);
        api.logWeight(todayDate, 180.0);

        page.setViewportSize(390, 844);
    }

    @AfterClass(alwaysRun = true)
    public void cleanup() {
        try {
            if (api != null) {
                api.deleteStepsOnDate(todayDate);
                api.deleteWeightOnDate(todayDate);
            }
        } catch (Exception ignored) {}
    }

    /** Matches the app's shortDate(): "Wed 10/28". */
    private static String shortDate(LocalDate d) {
        return d.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.US)
                + " " + d.getMonthValue() + "/" + d.getDayOfMonth();
    }

    @Test(priority = 1)
    public void weeklyShowsOneChartAtATime() {
        step("open /history/weekly at phone width");
        history.openWeekly(baseUrl);

        step("calories chart shows by default, steps chart is hidden");
        history.waitForChartShown("Calories per day");
        history.waitForChartHidden("Steps per day");

        step("switch to Steps");
        history.selectWeeklyChart("Steps");
        history.waitForChartShown("Steps per day");
        history.waitForChartHidden("Calories per day");
    }

    @Test(priority = 2, dependsOnMethods = "weeklyShowsOneChartAtATime")
    public void weeklyTapADayShowsIt() {
        LocalDate now = LocalDate.now();
        LocalDate sunday = now.minusDays(now.getDayOfWeek().getValue() % 7);

        step("tap Sunday's compact day button");
        history.clickDayCard(shortDate(sunday));

        step("the day panel switches to Sunday");
        history.waitForDayPanelTitle(shortDate(sunday));
    }

    @Test(priority = 3)
    public void totalOpensDayInBottomSheet() {
        step("open /history/total at phone width");
        history.openTotal(baseUrl);

        step("color days by Steps using the dropdown");
        history.selectHeatmapMetricOnPhone("steps");
        history.waitForCalendarDayLabel(todayDate, "Steps 8,500");

        step("tap today: it opens in a bottom sheet");
        history.clickCalendarDay(todayDate);
        String today = shortDate(LocalDate.now());
        history.waitForDaySheet(today);
        if (!history.daySheetContains(today, "180 lbs")) {
            throw new AssertionError("Expected today's sheet to show the seeded 180 lbs weight");
        }
        history.waitForNextDayDisabled();

        step("previous day moves the sheet to yesterday");
        history.clickPreviousDay();
        history.waitForDaySheet(shortDate(LocalDate.now().minusDays(1)));

        step("close the sheet");
        history.closeDaySheet();
    }
}
