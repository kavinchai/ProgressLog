package com.kavin.fitness.e2e.steps;

import com.kavin.fitness.e2e.pages.EditExerciseModal;
import com.kavin.fitness.e2e.pages.TodayPage;
import com.kavin.fitness.e2e.pages.WorkoutBuilderModal;
import com.qmetry.qaf.automation.step.QAFTestStep;
import com.qmetry.qaf.automation.ui.WebDriverTestBase;
import org.openqa.selenium.By;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public class WorkoutSteps {

    private final TodayPage todayPage = new TodayPage();
    private final WorkoutBuilderModal workoutModal = new WorkoutBuilderModal();
    private final EditExerciseModal editModal = new EditExerciseModal();

    // ── Workout Builder Modal ────────────────────────────────────────────────

    @QAFTestStep(description = "user clicks Add Workout button")
    public void userClicksAddWorkout() {
        todayPage.clickAddWorkout();
    }

    @QAFTestStep(description = "workout builder modal is displayed")
    public void workoutBuilderModalIsDisplayed() {
        WebDriverWait wait = new WebDriverWait(
                new WebDriverTestBase().getDriver(), Duration.ofSeconds(5));
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector(".modal-title")));
        assert workoutModal.getTitle().contains("Log Workout") :
                "Expected 'Log Workout' modal but got: " + workoutModal.getTitle();
    }

    @QAFTestStep(description = "user enters session name {name}")
    public void userEntersSessionName(String name) {
        workoutModal.enterSessionName(name);
    }

    @QAFTestStep(description = "user clicks Add Exercise button")
    public void userClicksAddExercise() {
        workoutModal.clickAddExercise();
    }

    @QAFTestStep(description = "user clicks Add Run button")
    public void userClicksAddRun() {
        workoutModal.clickAddRun();
    }

    @QAFTestStep(description = "user clicks Add Timed button")
    public void userClicksAddTimed() {
        workoutModal.clickAddTimed();
    }

    @QAFTestStep(description = "user enters exercise name {name} at index {index}")
    public void userEntersExerciseName(String name, int index) {
        workoutModal.enterExerciseName(index, name);
    }

    @QAFTestStep(description = "user enters weight {weight} at index {index}")
    public void userEntersWeight(String weight, int index) {
        workoutModal.enterWeight(index, weight);
    }

    @QAFTestStep(description = "user enters reps {reps} at index {index}")
    public void userEntersReps(String reps, int index) {
        workoutModal.enterReps(index, reps);
    }

    @QAFTestStep(description = "user enters distance {distance} at index {index}")
    public void userEntersDistance(String distance, int index) {
        workoutModal.enterDistance(index, distance);
    }

    @QAFTestStep(description = "user enters duration hours {h} minutes {m} seconds {s} at index {index}")
    public void userEntersDuration(String h, String m, String s, int index) {
        workoutModal.enterHours(index, h);
        workoutModal.enterMinutes(index, m);
        workoutModal.enterSeconds(index, s);
    }

    @QAFTestStep(description = "user enters run time minutes {m} seconds {s} at index {index}")
    public void userEntersRunTime(String m, String s, int index) {
        workoutModal.enterMinutes(index, m);
        workoutModal.enterSeconds(index, s);
    }

    @QAFTestStep(description = "user clicks Add Set for exercise at index {index}")
    public void userClicksAddSet(int index) {
        workoutModal.clickAddSet(index);
    }

    @QAFTestStep(description = "user toggles exercise type at index {index}")
    public void userTogglesExerciseType(int index) {
        workoutModal.toggleExerciseType(index);
    }

    @QAFTestStep(description = "user saves the workout")
    public void userSavesWorkout() {
        workoutModal.save();
    }

    @QAFTestStep(description = "user cancels the workout modal")
    public void userCancelsWorkout() {
        workoutModal.cancel();
    }

    // ── Exercise display verification ────────────────────────────────────────

    @QAFTestStep(description = "exercise {name} is displayed on the page")
    public void exerciseIsDisplayed(String name) {
        WebDriverWait wait = new WebDriverWait(
                new WebDriverTestBase().getDriver(), Duration.ofSeconds(5));
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.xpath("//span[contains(@class,'day-exercise-name') and contains(text(),'" + name + "')]")));
    }

    @QAFTestStep(description = "exercise {name} shows weight {weight}")
    public void exerciseShowsWeight(String name, String weight) {
        WebDriverWait wait = new WebDriverWait(
                new WebDriverTestBase().getDriver(), Duration.ofSeconds(5));
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.xpath("//div[contains(@class,'day-exercise-item')]" +
                        "[.//span[contains(text(),'" + name + "')]]" +
                        "[.//span[contains(text(),'" + weight + "')]]")));
    }

    @QAFTestStep(description = "exercise {name} shows reps {reps}")
    public void exerciseShowsReps(String name, String reps) {
        WebDriverWait wait = new WebDriverWait(
                new WebDriverTestBase().getDriver(), Duration.ofSeconds(5));
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.xpath("//div[contains(@class,'day-exercise-item')]" +
                        "[.//span[contains(text(),'" + name + "')]]" +
                        "[.//div[contains(@class,'day-exercise-reps') and contains(text(),'" + reps + "')]]")));
    }

    @QAFTestStep(description = "exercise {name} shows distance {distance}")
    public void exerciseShowsDistance(String name, String distance) {
        WebDriverWait wait = new WebDriverWait(
                new WebDriverTestBase().getDriver(), Duration.ofSeconds(5));
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.xpath("//div[contains(@class,'day-exercise-item')]" +
                        "[.//span[contains(text(),'" + name + "')]]" +
                        "[.//div[contains(@class,'day-exercise-reps') and contains(text(),'" + distance + "')]]")));
    }

    @QAFTestStep(description = "exercise {name} shows duration {duration}")
    public void exerciseShowsDuration(String name, String duration) {
        WebDriverWait wait = new WebDriverWait(
                new WebDriverTestBase().getDriver(), Duration.ofSeconds(5));
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.xpath("//div[contains(@class,'day-exercise-item')]" +
                        "[.//span[contains(text(),'" + name + "')]]" +
                        "[.//div[contains(@class,'day-exercise-reps') and contains(text(),'" + duration + "')]]")));
    }

    @QAFTestStep(description = "exercise {name} does not show weight")
    public void exerciseDoesNotShowWeight(String name) {
        var items = new WebDriverTestBase().getDriver().findElements(
                By.xpath("//div[contains(@class,'day-exercise-item')]" +
                        "[.//span[contains(text(),'" + name + "')]]" +
                        "[.//span[contains(text(),'lbs')]]"));
        assert items.isEmpty() : "Expected no weight display for " + name + " but found one";
    }

    // ── Edit Exercise Modal ──────────────────────────────────────────────────

    @QAFTestStep(description = "user clicks Edit on exercise at index {index}")
    public void userClicksEditExercise(int index) {
        todayPage.clickEditExercise(index);
    }

    @QAFTestStep(description = "edit exercise modal shows title containing {text}")
    public void editExerciseModalShowsTitle(String text) {
        WebDriverWait wait = new WebDriverWait(
                new WebDriverTestBase().getDriver(), Duration.ofSeconds(5));
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector(".modal-title")));
        assert editModal.getTitle().contains(text) :
                "Expected title to contain '" + text + "' but got: " + editModal.getTitle();
    }

    @QAFTestStep(description = "user edits weight to {weight} at set index {index}")
    public void userEditsWeight(String weight, int index) {
        editModal.enterWeight(index, weight);
    }

    @QAFTestStep(description = "user edits distance to {distance} at set index {index}")
    public void userEditsDistance(String distance, int index) {
        editModal.enterDistance(index, distance);
    }

    @QAFTestStep(description = "user edits minutes to {minutes} at set index {index}")
    public void userEditsMinutes(String minutes, int index) {
        editModal.enterMinutes(index, minutes);
    }

    @QAFTestStep(description = "user saves the exercise edit")
    public void userSavesExerciseEdit() {
        editModal.save();
    }

    @QAFTestStep(description = "user deletes the exercise")
    public void userDeletesExercise() {
        editModal.deleteExercise();
    }

    // ── Workout session actions ──────────────────────────────────────────────

    @QAFTestStep(description = "user renames workout session to {name}")
    public void userRenamesWorkoutSession(String name) {
        todayPage.clickRenameWorkout();
        WebDriverWait wait = new WebDriverWait(
                new WebDriverTestBase().getDriver(), Duration.ofSeconds(3));
        var input = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector(".day-detail-section:nth-child(4) input[type='text']")));
        input.clear();
        input.sendKeys(name);
        new WebDriverTestBase().getDriver().findElement(
                By.xpath("//div[contains(@class,'day-detail-section')][4]//button[contains(@class,'btn-primary') and text()='Save']")
        ).click();
    }

    @QAFTestStep(description = "workout session name shows {name}")
    public void workoutSessionNameShows(String name) {
        WebDriverWait wait = new WebDriverWait(
                new WebDriverTestBase().getDriver(), Duration.ofSeconds(5));
        wait.until(ExpectedConditions.textToBePresentInElementLocated(
                By.cssSelector(".day-detail-section:nth-child(4) .day-detail-label .muted"),
                name));
    }

    @QAFTestStep(description = "user deletes the workout session")
    public void userDeletesWorkoutSession() {
        todayPage.clickDeleteWorkout();
    }
}
