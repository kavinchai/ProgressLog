package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.TodayPage;
import com.kavin.fitness.e2e.pages.WorkoutBuilderModal;
import com.kavin.fitness.e2e.support.BaseTest;
import com.kavin.fitness.e2e.support.TestApiClient;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import java.time.LocalDate;

/**
 * Typing a spelling variant of a lift the user already logs ("zercher squat"
 * for "Zercher Squats") offers the existing name, and using it saves the
 * workout under that name instead of creating a new lift.
 */
public class ExerciseNameMatchTest extends BaseTest {
    private static final String LIFT = "Zercher Squats";
    private static final String SEED_SESSION = "Name Match Seed";

    private TodayPage today;
    private WorkoutBuilderModal workout;
    private TestApiClient apiClient;
    private String seedDate;
    private String todayDate;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        String username = System.getProperty("test.user.username", "qaf-test");
        String password = System.getProperty("test.user.password", "qaf-test-password");
        String apiUrl = System.getProperty("env.apiurl", "http://localhost:8080/api");

        today = new TodayPage(page);
        workout = new WorkoutBuilderModal(page);
        apiClient = new TestApiClient(apiUrl);
        apiClient.login(username, password);

        seedDate = LocalDate.now().minusDays(1).toString();
        todayDate = LocalDate.now().toString();
        apiClient.deleteWorkoutsOnDate(seedDate, SEED_SESSION); // leftovers from an aborted run
        apiClient.logLiftingWorkout(seedDate, SEED_SESSION, LIFT, 135, 5);

        navigateToToday();
        today.deleteWorkoutIfExists();
    }

    @AfterClass(alwaysRun = true)
    public void cleanup() {
        try {
            if (apiClient != null) {
                apiClient.deleteWorkoutsOnDate(seedDate, SEED_SESSION);
                apiClient.deleteWorkoutsOnDate(todayDate);
            }
        } catch (Exception ignored) {}
    }

    @Test(priority = 1)
    public void spellingVariantSuggestsAndSavesTheExistingName() {
        step("open the builder and type a spelling variant of an existing lift");
        today.clickAddWorkout();
        workout.waitUntilVisible();
        workout.clickAddExercise();
        workout.waitForExerciseCount(1);
        workout.enterExerciseName(0, "zercher squat");
        workout.enterWeight(0, "155");
        workout.enterReps(0, "5");
        workout.leaveExerciseName();

        step("verify Did you mean " + LIFT + "? is offered");
        if (!workout.awaitDidYouMean(LIFT)) {
            throw new AssertionError("Expected 'Did you mean " + LIFT + "?' after leaving the name field");
        }

        step("use the existing name");
        workout.useSuggestedName(LIFT);
        if (!LIFT.equals(workout.exerciseNameValue(0))) {
            throw new AssertionError("Expected the name to become '" + LIFT + "', got: "
                    + workout.exerciseNameValue(0));
        }
        if (!workout.awaitMatchesExistingLift()) {
            throw new AssertionError("Expected '✓ Matches your existing lift' after using the suggestion");
        }

        step("save and verify the workout is logged under the existing name");
        workout.save();
        waitForModalClosed();
        today.waitForExercise(LIFT);
        today.waitForExerciseDetail(LIFT, "155 lbs");
    }
}
