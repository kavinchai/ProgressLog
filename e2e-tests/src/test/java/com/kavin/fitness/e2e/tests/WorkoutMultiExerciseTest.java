package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.EditExerciseModal;
import com.kavin.fitness.e2e.pages.TodayPage;
import com.kavin.fitness.e2e.pages.WorkoutBuilderModal;
import com.kavin.fitness.e2e.support.BaseTest;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

public class WorkoutMultiExerciseTest extends BaseTest {
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
    public void addMultipleExerciseTypes() {
        step("open workout builder");
        today.clickAddWorkout();
        workout.waitUntilVisible();

        step("add lifting exercise: Overhead Press 95x10");
        workout.clickAddExercise();
        workout.enterExerciseName(0, "Overhead Press");
        workout.enterWeight(0, "95");
        workout.enterReps(0, "10");

        step("save workout");
        workout.save();
        waitForModalClosed();

        step("verify Overhead Press displayed");
        today.waitForExercise("Overhead Press");
        today.waitForExerciseDetail("Overhead Press", "95 lbs");
    }

    @Test(priority = 2, dependsOnMethods = "addMultipleExerciseTypes")
    public void addSecondExerciseToExistingWorkout() {
        step("click add exercise to existing workout");
        today.clickAddWorkout();
        workout.waitUntilVisible();

        step("add Run 2 mi, 18m 0s");
        workout.clickAddRun();
        workout.enterDistance(0, "2");
        workout.enterRunMinutes(0, "18");
        workout.enterRunSeconds(0, "0");
        workout.save();
        waitForModalClosed();

        step("verify both exercises displayed");
        today.waitForExercise("Overhead Press");
        today.waitForExercise("Run");
        today.waitForExerciseDetail("Run", "2 mi");
    }

    @Test(priority = 3, dependsOnMethods = "addSecondExerciseToExistingWorkout")
    public void addThirdTimedExercise() {
        step("add timed exercise");
        today.clickAddWorkout();
        workout.waitUntilVisible();

        step("add Yoga, 1h 0m 0s");
        workout.clickAddTimed();
        workout.enterExerciseName(0, "Yoga");
        workout.enterDuration(0, "1", "0", "0");
        workout.save();
        waitForModalClosed();

        step("verify all three exercises displayed");
        today.waitForExercise("Overhead Press");
        today.waitForExercise("Run");
        today.waitForExercise("Yoga");
        today.waitForExerciseDetail("Yoga", "1h");
    }

    @Test(priority = 4, dependsOnMethods = "addThirdTimedExercise")
    public void deleteMiddleExerciseLeavesOthers() {
        step("click Edit on Run (index 1)");
        today.clickEditExercise(1);
        editModal.waitUntilTitleContains("Run");

        step("delete Run exercise");
        editModal.deleteExercise();
        waitForModalClosed();

        step("verify Run is gone but others remain");
        if (today.isExerciseVisible("Run")) {
            throw new AssertionError("Expected Run to be deleted");
        }
        today.waitForExercise("Overhead Press");
        today.waitForExercise("Yoga");
    }
}
