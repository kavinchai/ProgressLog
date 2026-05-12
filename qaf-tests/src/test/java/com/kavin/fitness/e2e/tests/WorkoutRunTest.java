package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.EditExerciseModal;
import com.kavin.fitness.e2e.pages.TodayPage;
import com.kavin.fitness.e2e.pages.WorkoutBuilderModal;
import com.kavin.fitness.e2e.support.BaseTest;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

public class WorkoutRunTest extends BaseTest {
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
    public void addRunExerciseWithDistanceAndTime() {
        step("open workout builder, click Add Run");
        today.clickAddWorkout();
        workout.waitUntilVisible();
        workout.clickAddRun();

        step("enter distance 3.1, time 25m30s, save");
        workout.enterDistance(0, "3.1");
        workout.enterRunMinutes(0, "25");
        workout.enterRunSeconds(0, "30");
        workout.save();

        step("Run shows 3.1 mi, 25m 30s, no weight");
        waitForModalClosed();
        today.waitForExercise("Run");
        today.waitForExerciseDetail("Run", "3.1 mi");
        today.waitForExerciseDetail("Run", "25m 30s");
        today.assertExerciseDoesNotShowWeight("Run");
    }

    @Test(priority = 2, dependsOnMethods = "addRunExerciseWithDistanceAndTime")
    public void editExistingRunDistance() {
        step("click Edit on Run");
        today.clickEditExercise(0);
        editModal.waitUntilTitleContains("Run");

        step("edit distance to 5, save");
        editModal.editDistance(0, "5");
        editModal.save();

        step("Run shows distance 5 mi");
        waitForModalClosed();
        today.waitForExerciseDetail("Run", "5 mi");
    }
}
