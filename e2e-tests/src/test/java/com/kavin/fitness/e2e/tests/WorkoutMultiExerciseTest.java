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
    public void addMultipleExerciseTypesInOneSession() {
        step("open workout builder");
        today.clickAddWorkout();
        workout.waitUntilVisible();

        step("add lifting exercise: Overhead Press 95x10");
        workout.clickAddExercise();
        workout.waitForExerciseCount(1);
        workout.enterExerciseName(0, "Overhead Press");
        workout.enterWeight(0, "95");
        workout.enterReps(0, "10");

        step("add Run: 2 mi, 18m 0s (name pre-filled by + Run)");
        workout.clickAddRun();
        workout.waitForExerciseCount(2);
        workout.enterDistance(0, "2");
        workout.enterRunMinutes(0, "18");
        workout.enterRunSeconds(0, "0");

        step("add Timed exercise: Yoga 0h 30m 0s");
        workout.clickAddTimed();
        workout.waitForExerciseCount(3);
        workout.enterExerciseName(2, "Yoga");
        workout.enterDuration(1, "0", "30", "0");

        step("save workout");
        workout.save();
        waitForModalClosed();

        step("verify all three exercises displayed");
        today.waitForExercise("Overhead Press");
        today.waitForExerciseDetail("Overhead Press", "95");
        today.waitForExercise("Run");
        today.waitForExerciseDetail("Run", "2 mi");
        today.waitForExercise("Yoga");
        today.waitForExerciseDetail("Yoga", "30m");
    }

    @Test(priority = 2, dependsOnMethods = "addMultipleExerciseTypesInOneSession")
    public void deleteMiddleExerciseLeavesOthers() {
        step("click Edit on Run exercise");
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
