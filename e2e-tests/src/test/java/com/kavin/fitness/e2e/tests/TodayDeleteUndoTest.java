package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.TodayPage;
import com.kavin.fitness.e2e.support.BaseTest;
import com.kavin.fitness.e2e.support.TestApiClient;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import java.time.LocalDate;

/**
 * Deleting on Today happens straight away, with no "Are you sure?" pop-up, and an Undo bar
 * brings the entry back. On the website the delete lives in each row's ••• menu (phones swipe).
 */
public class TodayDeleteUndoTest extends BaseTest {
    private TodayPage today;
    private TestApiClient api;
    private String todayDate;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        today = new TodayPage(page);
        todayDate = LocalDate.now().toString();

        String apiUrl = System.getProperty("env.apiurl", "http://localhost:8080/api");
        String username = System.getProperty("test.user.username", "qaf-test");
        String password = System.getProperty("test.user.password", "qaf-test-password");
        api = new TestApiClient(apiUrl);
        api.login(username, password);
        api.deleteWeightOnDate(todayDate);
        api.deleteWorkoutsOnDate(todayDate);
        api.logWeight(todayDate, 181.0);
        api.logLiftingWorkout(todayDate, "Undo day", "Deadlift", 315.0, 5);

        navigateToToday();
    }

    @AfterClass(alwaysRun = true)
    public void cleanup() {
        try {
            if (api != null) {
                api.deleteWeightOnDate(todayDate);
                api.deleteWorkoutsOnDate(todayDate);
            }
        } catch (Exception ignored) {}
    }

    @Test(priority = 1)
    public void deletingWeightIsImmediateAndUndoBringsItBack() {
        today.waitForWeightValue("181 lbs");

        step("delete today's weight from its ••• menu");
        today.deleteWeight();

        step("it's gone straight away, with no confirmation dialog");
        today.waitForNoWeight();
        if (page.locator(".modal-box").count() > 0) {
            throw new AssertionError("Did not expect a confirmation dialog");
        }

        step("Undo brings it back");
        today.undoLastDelete();
        today.waitForWeightValue("181 lbs");
    }

    @Test(priority = 2)
    public void deletingAnExerciseIsImmediateAndUndoBringsItBack() {
        today.waitForExercise("Deadlift");

        step("delete the exercise from its row's ••• menu");
        today.deleteExercise("Deadlift");

        step("the row is gone");
        if (!today.waitForExerciseGone("Deadlift")) {
            throw new AssertionError("Expected the Deadlift row to disappear");
        }

        step("Undo brings it back");
        today.undoLastDelete();
        today.waitForExercise("Deadlift");
    }
}
