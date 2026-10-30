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
        today = new TodayPage(page);
        workout = new WorkoutBuilderModal(page);
        editModal = new EditExerciseModal(page);
        navigateToToday();
        today.deleteWorkoutIfExists();
    }

    @Test(priority = 1)
    public void addMultipleExercisesInOneSession() {
        step("open workout builder");
        today.clickAddWorkout();
        workout.waitUntilVisible();

        step("add lifting exercise: Overhead Press 95x10");
        workout.clickAddExercise();
        workout.waitForExerciseCount(1);
        workout.enterExerciseName(0, "Overhead Press");
        workout.enterWeight(0, "95");
        workout.enterReps(0, "10");

        step("add lifting exercise: Bicep Curls 30x12");
        workout.clickAddExercise();
        workout.waitForExerciseCount(2);
        workout.enterExerciseName(1, "Bicep Curls");
        workout.enterWeight(1, "30");
        workout.enterReps(1, "12");

        step("add lifting exercise: Lateral Raises 20x15");
        workout.clickAddExercise();
        workout.waitForExerciseCount(3);
        workout.enterExerciseName(2, "Lateral Raises");
        workout.enterWeight(2, "20");
        workout.enterReps(2, "15");

        step("save workout");
        workout.save();
        waitForModalClosed();

        step("verify all three exercises displayed");
        today.waitForExercise("Overhead Press");
        today.waitForExerciseDetail("Overhead Press", "95 lbs");
        today.waitForExercise("Bicep Curls");
        today.waitForExerciseDetail("Bicep Curls", "30 lbs");
        today.waitForExercise("Lateral Raises");
        today.waitForExerciseDetail("Lateral Raises", "20 lbs");
    }

    @Test(priority = 2, dependsOnMethods = "addMultipleExercisesInOneSession")
    public void deleteMiddleExerciseLeavesOthers() {
        step("click Edit on Bicep Curls");
        today.clickEditExercise(1);
        editModal.waitUntilTitleContains("Bicep Curls");

        step("delete Bicep Curls");
        editModal.deleteExercise();
        waitForModalClosed();

        step("verify Bicep Curls is gone but others remain");
        if (!today.waitForExerciseGone("Bicep Curls")) {
            throw new AssertionError("Expected Bicep Curls to be deleted");
        }
        today.waitForExercise("Overhead Press");
        today.waitForExercise("Lateral Raises");
    }
}
