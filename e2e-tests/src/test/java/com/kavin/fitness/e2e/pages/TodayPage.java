package com.kavin.fitness.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.WaitForSelectorState;

import java.util.List;
import java.util.regex.Pattern;

public class TodayPage {
    private final Page page;

    // 0-based here; section-box index used by tests is 1-based to match the
    // original Selenium suite. Subtract one before .nth() lookups.
    private static final int WEIGHT_IDX = 1;
    private static final int STEPS_IDX = 2;
    private static final int WORKOUT_IDX = 3;
    private static final int NUTRITION_IDX = 4;

    public TodayPage(Page page) {
        this.page = page;
    }

    private Locator section(int sectionIdx) {
        return page.locator(".section-box").nth(sectionIdx - 1);
    }

    private Locator sectionBtnContains(int sectionIdx, String text) {
        return section(sectionIdx).locator("button", new Locator.LocatorOptions().setHasText(text));
    }

    private Locator sectionBtnExact(int sectionIdx, String text) {
        return section(sectionIdx).locator("button:text-is(\"" + text + "\")");
    }

    // ── Weight ───────────────────────────────────────────────────────────────

    public void clickAddWeight() {
        sectionBtnContains(WEIGHT_IDX, "+ Add").first().click();
    }

    public void clickEditWeight() {
        sectionBtnExact(WEIGHT_IDX, "Edit").first().click();
    }

    public void waitForWeightValue(String expected) {
        section(WEIGHT_IDX).locator(".today-data-value",
                new Locator.LocatorOptions().setHasText(expected)).waitFor();
    }

    // ── Steps ────────────────────────────────────────────────────────────────

    public void clickAddSteps() {
        Locator addBtns = sectionBtnContains(STEPS_IDX, "+ Add");
        if (addBtns.count() > 0) {
            addBtns.first().click();
        } else {
            sectionBtnExact(STEPS_IDX, "Edit").first().click();
        }
    }

    public void clickDeleteSteps() {
        section(STEPS_IDX).locator("button.btn-danger").click();
        confirmDeleteAndDismiss();
    }

    public void enterSteps(String value) {
        page.locator(".today-steps-edit input[type='number']").fill(value);
    }

    public void saveSteps() {
        page.locator(".today-steps-edit .btn-primary").click();
    }

    public void waitForStepsValue(String expected) {
        if ("--".equals(expected)) {
            section(STEPS_IDX).locator(".section-body",
                    new Locator.LocatorOptions().setHasText("No steps logged")).waitFor();
        } else {
            section(STEPS_IDX).locator(".today-data-value",
                    new Locator.LocatorOptions().setHasText(expected)).waitFor();
        }
    }

    // ── Nutrition / Meals ────────────────────────────────────────────────────

    // Meal boxes themselves live in the MealCards page object.

    /**
     * Waits until the totals row for {@code label} ("Calories" / "Protein") shows
     * exactly {@code eaten} as the amount eaten ("620 / 2600 kcal"), so a target
     * or "remaining" number can't satisfy the wait by accident.
     */
    public void waitForEaten(String label, int eaten) {
        page.locator(".nutrition-totals-row", new Page.LocatorOptions().setHasText(label))
                .filter(new Locator.FilterOptions()
                        .setHasText(Pattern.compile("(^|\\D)" + eaten + " / ")))
                .waitFor();
    }

    // ── Workout ──────────────────────────────────────────────────────────────

    private Locator workoutDeleteBtn() {
        return section(WORKOUT_IDX).locator("button.btn-danger:text-is(\"Delete\")");
    }

    private Locator workoutStartBtn() {
        return section(WORKOUT_IDX).locator("button",
                new Locator.LocatorOptions().setHasText("Start Workout"));
    }

    private Locator workoutAddExerciseBtn() {
        // The workout section offers two ways to add an exercise to an existing
        // session: the empty-state "+ Add exercise" button and the "+ Add
        // another exercise" row shown once exercises are present.
        return section(WORKOUT_IDX).locator("button",
                new Locator.LocatorOptions().setHasText(
                        Pattern.compile("\\+ Add( another)? exercise", Pattern.CASE_INSENSITIVE)));
    }

    /** Wait until the workout section has rendered its initial state. */
    private void waitForWorkoutSectionReady() {
        page.waitForCondition(() ->
                workoutStartBtn().count() > 0 || workoutDeleteBtn().count() > 0);
    }

    public void deleteWorkoutIfExists() {
        waitForWorkoutSectionReady();
        // Loop because an account can have multiple workout sessions per day.
        while (workoutDeleteBtn().count() > 0) {
            try {
                workoutDeleteBtn().first().click();
            } catch (Exception ignored) {
                continue;
            }
            confirmDeleteAndDismiss();
            page.waitForCondition(() ->
                    workoutStartBtn().count() > 0 || workoutDeleteBtn().count() > 0);
        }
    }

    public void clickAddWorkout() {
        waitForWorkoutSectionReady();
        if (workoutStartBtn().count() > 0) {
            workoutStartBtn().first().click();
        } else if (workoutAddExerciseBtn().count() > 0) {
            workoutAddExerciseBtn().first().click();
        } else {
            throw new AssertionError("Neither Start Workout nor + Exercise visible in workout section");
        }
    }

    public void renameWorkoutSession(String newName) {
        sectionBtnExact(WORKOUT_IDX, "Rename").click();
        Locator input = section(WORKOUT_IDX).locator("input[type='text']");
        input.fill(newName);
        section(WORKOUT_IDX).locator("button.btn-primary:text-is(\"Save\")").click();
    }

    public void waitForSessionName(String name) {
        section(WORKOUT_IDX).locator(".section-title .workout-session-name",
                new Locator.LocatorOptions().setHasText(name)).waitFor();
    }

    // ── Exercises ────────────────────────────────────────────────────────────

    public void waitForExercise(String name) {
        page.locator("span.exercise-card-name",
                new Page.LocatorOptions().setHasText(name)).first().waitFor();
    }

    public void waitForExerciseDetail(String exerciseName, String detail) {
        try {
            page.waitForCondition(() -> {
                List<Locator> cards = page.locator(".exercise-card").all();
                for (Locator card : cards) {
                    String text = card.innerText();
                    if (text.contains(exerciseName) && text.contains(detail)) return true;
                }
                return false;
            });
        } catch (com.microsoft.playwright.TimeoutError e) {
            System.err.println(">>> waitForExerciseDetail FAILED — expected name='" + exerciseName
                    + "' detail='" + detail + "'. Dumping all exercise-card text:");
            List<Locator> cards = page.locator(".exercise-card").all();
            if (cards.isEmpty()) {
                System.err.println("    (no exercise-card elements on page)");
            } else {
                for (int i = 0; i < cards.size(); i++) {
                    String text = cards.get(i).innerText().replace("\n", " | ");
                    System.err.println("    card[" + i + "]: " + text);
                }
            }
            throw e;
        }
    }

    public void clickEditExercise(int index) {
        page.locator(".exercise-card .btn.btn-sm").nth(index).click();
    }

    public boolean isTextVisible(String text) {
        return page.locator(":text(\"" + text + "\")").count() > 0;
    }

    /** Waits up to 5s for the exercise's card to disappear; false if it's still there. */
    public boolean waitForExerciseGone(String name) {
        try {
            page.locator("span.exercise-card-name", new Page.LocatorOptions().setHasText(name))
                    .first().waitFor(new Locator.WaitForOptions()
                            .setState(WaitForSelectorState.DETACHED).setTimeout(5000));
            return true;
        } catch (com.microsoft.playwright.TimeoutError e) {
            return false;
        }
    }

    public boolean isExerciseVisible(String name) {
        return page.locator("span.exercise-card-name",
                new Page.LocatorOptions().setHasText(name)).count() > 0;
    }

    /**
     * After clicking a delete button that opens a ConfirmDeleteModal,
     * click "Confirm Delete", wait for success, then click "Done".
     */
    private void confirmDeleteAndDismiss() {
        page.locator(".modal-box >> button:has-text(\"Confirm Delete\")").click();
        Locator done = page.locator(".modal-box >> button:has-text(\"Done\")");
        done.waitFor(new Locator.WaitForOptions().setTimeout(30000));
        done.click();
        page.locator(".modal-title").first().waitFor(
                new Locator.WaitForOptions().setState(WaitForSelectorState.HIDDEN));
    }
}
