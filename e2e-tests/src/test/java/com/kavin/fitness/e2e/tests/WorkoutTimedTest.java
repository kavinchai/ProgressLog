package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.EditExerciseModal;
import com.kavin.fitness.e2e.pages.TodayPage;
import com.kavin.fitness.e2e.pages.WorkoutBuilderModal;
import com.kavin.fitness.e2e.support.BaseTest;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

public class WorkoutTimedTest extends BaseTest {
    private TodayPage today;
    private WorkoutBuilderModal workout;
    private EditExerciseModal editModal;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        today = new TodayPage(driver);
        workout = new WorkoutBuilderModal(driver);
        editModal = new EditExerciseModal(driver);
        navigateToToday();
        today.deleteWorkoutIfExists();
    }

    @Test(priority = 1)
    public void addTimedActivity() {
        step("open workout builder, click Add Timed");
        today.clickAddWorkout();
        workout.waitUntilVisible();
        workout.clickAddTimed();

        step("name 'Plank', duration 0h 2m 30s, save");
        workout.enterExerciseName(0, "Plank");
        workout.enterDuration(0, "0", "2", "30");
        workout.save();

        step("Plank shows duration '2m 30s', no weight");
        waitForModalClosed();
        today.waitForExercise("Plank");
        today.waitForExerciseDetail("Plank", "2m 30s");
        today.assertExerciseDoesNotShowWeight("Plank");
    }

    @Test(priority = 2, dependsOnMethods = "addTimedActivity")
    public void timedActivityDisplaysDurationOnly() {
        step("Plank does not show 'Distance', 'Pace', or '0 lbs'");
        if (today.isTextVisible("Distance")) {
            throw new AssertionError("Did not expect 'Distance' to be visible for Plank");
        }
        if (today.isTextVisible("Pace")) {
            throw new AssertionError("Did not expect 'Pace' to be visible for Plank");
        }
        if (today.isTextVisible("0 lbs")) {
            throw new AssertionError("Did not expect '0 lbs' to be visible for Plank");
        }
    }

    @Test(priority = 3, dependsOnMethods = "addTimedActivity")
    public void editTimedActivityDuration() {
        step("click Edit on Plank");
        today.clickEditExercise(0);
        editModal.waitUntilTitleContains("Plank");

        step("edit minutes to 3, save");
        editModal.editMinutes(0, "3");
        editModal.save();

        step("Plank shows duration '3m 30s'");
        waitForModalClosed();
        today.waitForExerciseDetail("Plank", "3m 30s");
    }
}
