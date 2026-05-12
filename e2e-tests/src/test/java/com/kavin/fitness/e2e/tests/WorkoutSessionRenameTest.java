package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.TodayPage;
import com.kavin.fitness.e2e.pages.WorkoutBuilderModal;
import com.kavin.fitness.e2e.support.BaseTest;
import org.openqa.selenium.By;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

public class WorkoutSessionRenameTest extends BaseTest {
    private TodayPage today;
    private WorkoutBuilderModal workout;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        today = new TodayPage(driver);
        workout = new WorkoutBuilderModal(driver);
        driver.get(baseUrl + "/today");
        waitForPageLoad();
        wait.until(ExpectedConditions.presenceOfElementLocated(
                By.cssSelector(".section-box")));
        today.deleteWorkoutIfExists();
    }

    @Test(priority = 1)
    public void createWorkoutSessionWithName() {
        step("open workout builder");
        today.clickAddWorkout();
        workout.waitUntilVisible();

        step("enter session name 'Morning Workout', add exercise, save");
        workout.enterSessionName("Morning Workout");
        workout.clickAddExercise();
        workout.waitForExerciseCount(1);
        workout.enterExerciseName(0, "Deadlift");
        workout.enterWeight(0, "315");
        workout.enterReps(0, "5");
        workout.save();

        step("verify session name displayed");
        waitForModalClosed();
        today.waitForSessionName("Morning Workout");
    }

    @Test(priority = 2, dependsOnMethods = "createWorkoutSessionWithName")
    public void renameWorkoutSession() {
        step("click Rename and change to 'Evening Workout'");
        today.renameWorkoutSession("Evening Workout");

        step("verify renamed session name displayed");
        today.waitForSessionName("Evening Workout");
    }

    @Test(priority = 3, dependsOnMethods = "renameWorkoutSession")
    public void deleteWorkoutSession() {
        step("delete workout");
        today.deleteWorkoutIfExists();

        step("verify workout is deleted (Start Workout button visible)");
        wait.until(d -> today.isTextVisible("Start Workout"));
    }
}
