package com.kavin.fitness.e2e.pages;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import com.microsoft.playwright.options.WaitForSelectorState;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

public class TodayPage {
    private final Page page;

    // 0-based here; section-box index used by tests is 1-based to match the
    // original Selenium suite. Subtract one before .nth() lookups.
    // Weight and steps share the first card, a row each.
    private static final int DAILY_IDX = 1;
    private static final int WORKOUT_IDX = 2;

    public TodayPage(Page page) {
        this.page = page;
    }

    private Locator section(int sectionIdx) {
        return page.locator(".section-box").nth(sectionIdx - 1);
    }

    private Locator button(String name) {
        return page.getByRole(AriaRole.BUTTON,
                new Page.GetByRoleOptions().setName(name).setExact(true));
    }

    /** Opens a ••• menu (shown on the website, where you can't swipe) and picks an action. */
    private void chooseFromMenu(String menuName, String item) {
        button(menuName).click();
        page.getByRole(AriaRole.MENUITEM,
                new Page.GetByRoleOptions().setName(item).setExact(true)).click();
    }

    // ── Weight ───────────────────────────────────────────────────────────────

    public void clickAddWeight() {
        button("+ Add weight").click();
    }

    /** Taps the weight row, which opens it for editing. */
    public void clickEditWeight() {
        button("Edit weight").click();
    }

    public void waitForWeightValue(String expected) {
        section(DAILY_IDX).locator(".status-row-detail",
                new Locator.LocatorOptions().setHasText(expected)).waitFor();
    }

    /** Deletes today's weight from its ••• menu; no confirmation, an Undo bar appears. */
    public void deleteWeight() {
        chooseFromMenu("More actions for Weight", "Delete");
    }

    public void waitForNoWeight() {
        button("+ Add weight").waitFor();
    }

    /** Presses Undo on the Undo bar and waits for the server to restore the entry. */
    public void undoLastDelete() {
        page.waitForResponse(
                r -> r.url().endsWith("/undo") && "POST".equals(r.request().method()),
                () -> button("Undo").click());
    }

    // ── Steps ────────────────────────────────────────────────────────────────

    public void clickAddSteps() {
        page.waitForCondition(
                () -> button("+ Add steps").count() > 0 || button("Edit steps").count() > 0);
        if (button("+ Add steps").count() > 0) {
            button("+ Add steps").click();
        } else {
            button("Edit steps").click();
        }
    }

    /** Deletes today's steps from the row's ••• menu; no confirmation, an Undo bar appears. */
    public void clickDeleteSteps() {
        chooseFromMenu("More actions for Steps", "Delete");
    }

    private Locator stepsField() {
        return page.locator(".modal-box").getByLabel("Steps",
                new Locator.GetByLabelOptions().setExact(true));
    }

    /** Waits for the steps sheet with this title ("Log Steps" / "Edit Steps"). */
    public void waitForStepsSheet(String title) {
        page.locator(".modal-box .modal-title:text-is(\"" + title + "\")").waitFor();
    }

    public String getStepsInputValue() {
        return stepsField().inputValue();
    }

    /** Types into the Steps field of the steps sheet. */
    public void enterSteps(String value) {
        stepsField().fill(value);
    }

    /** Presses Save at the top of the steps sheet and waits for it to close. */
    public void saveSteps() {
        page.locator(".modal-box .modal-header-save").click();
        page.locator(".modal-box").waitFor(
                new Locator.WaitForOptions().setState(WaitForSelectorState.DETACHED));
    }

    public void waitForStepsValue(String expected) {
        section(DAILY_IDX).locator(".status-row-detail",
                new Locator.LocatorOptions().setHasText(expected)).waitFor();
    }

    public void waitForNoSteps() {
        button("+ Add steps").waitFor();
    }

    // ── Nutrition / Meals ────────────────────────────────────────────────────

    // Meal boxes themselves live in the MealCards page object.

    /**
     * Waits until the progress bar for {@code label} ("Calories" / "Protein") at the
     * top of the page shows exactly {@code eaten} as the amount eaten
     * ("620/2,600 kcal"), so a goal or "remaining" number can't satisfy the wait by
     * accident.
     */
    public void waitForEaten(String label, int eaten) {
        page.locator(".daily-progress-item")
                .filter(new Locator.FilterOptions().setHas(
                        page.locator(".daily-progress-label:text-is(\"" + label + "\")")))
                .locator(".daily-progress-value")
                .filter(new Locator.FilterOptions().setHasText(
                        Pattern.compile("^" + String.format(Locale.US, "%,d", eaten) + "/")))
                .waitFor();
    }

    // ── Workout ──────────────────────────────────────────────────────────────

    private Locator workoutMenuBtn() {
        return button("More actions for workout");
    }

    /** The "No workout yet · + Start" row shown when today has no workout. */
    private Locator workoutStartBtn() {
        return button("Start workout");
    }

    private Locator workoutAddExerciseBtn() {
        return button("+ Add exercise");
    }

    /** Wait until the workout section has rendered its initial state. */
    private void waitForWorkoutSectionReady() {
        page.waitForCondition(() ->
                workoutStartBtn().count() > 0 || workoutMenuBtn().count() > 0);
    }

    public void deleteWorkoutIfExists() {
        waitForWorkoutSectionReady();
        // Loop because an account can have multiple workout sessions per day;
        // each delete removes one and the next one takes its place.
        while (workoutMenuBtn().count() > 0) {
            String before = section(WORKOUT_IDX).innerText();
            try {
                chooseFromMenu("More actions for workout", "Delete workout");
            } catch (Exception ignored) {
                continue;
            }
            page.waitForCondition(() ->
                    workoutStartBtn().count() > 0
                            || !section(WORKOUT_IDX).innerText().equals(before));
        }
    }

    public void clickAddWorkout() {
        waitForWorkoutSectionReady();
        if (workoutStartBtn().count() > 0) {
            workoutStartBtn().first().click();
        } else if (workoutAddExerciseBtn().count() > 0) {
            workoutAddExerciseBtn().first().click();
        } else {
            throw new AssertionError("Neither Start workout nor + Add exercise visible in workout section");
        }
    }

    public void renameWorkoutSession(String newName) {
        chooseFromMenu("More actions for workout", "Rename");
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
        button("Edit " + name).first().waitFor();
    }

    /** Waits until the exercise's row shows exactly these reps, one pill per set. */
    public void waitForSetReps(String name, String... reps) {
        assertThat(button("Edit " + name).first().locator(".set-pill")).hasText(reps);
    }

    /** Waits for the "No workout yet · + Start" row. */
    public void waitForNoWorkout() {
        workoutStartBtn().waitFor();
    }

    public void waitForExerciseDetail(String exerciseName, String detail) {
        try {
            page.waitForCondition(() -> {
                List<Locator> cards = page.locator(".exercise-row").all();
                for (Locator card : cards) {
                    String text = card.innerText();
                    if (text.contains(exerciseName) && text.contains(detail)) return true;
                }
                return false;
            });
        } catch (com.microsoft.playwright.TimeoutError e) {
            System.err.println(">>> waitForExerciseDetail FAILED — expected name='" + exerciseName
                    + "' detail='" + detail + "'. Dumping all exercise-row text:");
            List<Locator> cards = page.locator(".exercise-row").all();
            if (cards.isEmpty()) {
                System.err.println("    (no exercise-row elements on page)");
            } else {
                for (int i = 0; i < cards.size(); i++) {
                    String text = cards.get(i).innerText().replace("\n", " | ");
                    System.err.println("    row[" + i + "]: " + text);
                }
            }
            throw e;
        }
    }

    /** Taps the exercise row at {@code index}, which opens it for editing. */
    public void clickEditExercise(int index) {
        page.locator(".exercise-row .swipe-row-main").nth(index).click();
    }

    /** Taps the row for {@code name}; rows are sorted by name, so don't rely on position. */
    public void clickEditExercise(String name) {
        button("Edit " + name).click();
    }

    /** Deletes an exercise from its row's ••• menu; no confirmation, an Undo bar appears. */
    public void deleteExercise(String name) {
        chooseFromMenu("More actions for " + name, "Delete");
    }

    /** Waits up to 5s for the exercise's row to disappear; false if it's still there. */
    public boolean waitForExerciseGone(String name) {
        try {
            button("Edit " + name).first().waitFor(new Locator.WaitForOptions()
                    .setState(WaitForSelectorState.DETACHED).setTimeout(5000));
            return true;
        } catch (com.microsoft.playwright.TimeoutError e) {
            return false;
        }
    }

}
