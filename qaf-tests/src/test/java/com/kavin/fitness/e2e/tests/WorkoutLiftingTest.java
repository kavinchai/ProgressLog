package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.EditExerciseModal;
import com.kavin.fitness.e2e.pages.TodayPage;
import com.kavin.fitness.e2e.pages.WorkoutBuilderModal;
import com.kavin.fitness.e2e.support.BaseTest;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

public class WorkoutLiftingTest extends BaseTest {
    private TodayPage today;
    private WorkoutBuilderModal workout;
    private EditExerciseModal editModal;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        today = new TodayPage(driver);
        workout = new WorkoutBuilderModal(driver);
        editModal = new EditExerciseModal(driver);
        navigateToToday();
    }

    @Test(priority = 1)
    public void addSingleLiftingExerciseWithOneSet() {
        step("open workout builder");
        today.clickAddWorkout();
        workout.waitUntilVisible();

        step("session 'Push Day', Bench Press 135x8, save");
        workout.enterSessionName("Push Day");
        workout.clickAddExercise();
        workout.enterExerciseName(0, "Bench Press");
        workout.enterWeight(0, "135");
        workout.enterReps(0, "8");
        workout.save();

        step("Bench Press 135 lbs x 8 displayed");
        waitForModalClosed();
        today.waitForExercise("Bench Press");
        today.waitForExerciseDetail("Bench Press", "135 lbs");
        today.waitForExerciseDetail("Bench Press", "8");
    }

    @Test(priority = 2, dependsOnMethods = "addSingleLiftingExerciseWithOneSet")
    public void editExistingLiftingExerciseWeight() {
        step("click Edit on exercise 0");
        today.clickEditExercise(0);
        editModal.waitUntilTitleContains("Bench Press");

        step("edit weight to 145, save");
        editModal.editWeight(0, "145");
        editModal.save();

        step("Bench Press shows weight '145 lbs'");
        waitForModalClosed();
        today.waitForExerciseDetail("Bench Press", "145 lbs");
    }

    @Test(priority = 3, dependsOnMethods = "editExistingLiftingExerciseWeight")
    public void deleteExistingExercise() {
        step("click Edit on exercise 0");
        today.clickEditExercise(0);
        editModal.waitUntilTitleContains("Bench Press");

        step("click Delete");
        editModal.deleteExercise();

        step("Bench Press no longer visible");
        waitForModalClosed();
        if (today.isExerciseVisible("Bench Press")) {
            throw new AssertionError("Expected Bench Press to be removed");
        }
    }

    @Test(priority = 4, dependsOnMethods = "deleteExistingExercise")
    public void addLiftingExerciseWithMultipleSets() {
        step("open workout builder, add Squat with 2 sets");
        today.clickAddWorkout();
        workout.waitUntilVisible();
        workout.clickAddExercise();
        workout.enterExerciseName(0, "Squat");
        workout.enterWeight(0, "225");
        workout.enterReps(0, "5");
        workout.clickAddSet(0);
        workout.enterWeight(1, "245");
        workout.enterReps(1, "3");
        workout.save();

        step("Squat 225 lbs displayed");
        waitForModalClosed();
        today.waitForExercise("Squat");
        today.waitForExerciseDetail("Squat", "225 lbs");
    }
}
