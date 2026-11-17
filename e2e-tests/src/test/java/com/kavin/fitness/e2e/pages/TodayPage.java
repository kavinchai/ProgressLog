package com.kavin.fitness.e2e.pages;

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
        section(DAILY_IDX).locator(".today-data-value",
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

    public void enterSteps(String value) {
        page.locator(".today-steps-edit input[type='number']").fill(value);
    }

    public void saveSteps() {
        page.locator(".today-steps-edit .btn-primary").click();
    }

    public void waitForStepsValue(String expected) {
        if ("--".equals(expected)) {
            button("+ Add steps").waitFor();
        } else {
            section(DAILY_IDX).locator(".today-data-value",
                    new Locator.LocatorOptions().setHasText(expected)).waitFor();
        }
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
            throw new AssertionError("Neither Start Workout nor + Exercise visible in workout section");
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

    /** Taps the exercise card at {@code index}, which opens it for editing. */
    public void clickEditExercise(int index) {
        page.locator(".exercise-swipe-row .swipe-row-main").nth(index).click();
    }

    /** Taps the card for {@code name}; cards are sorted by name, so don't rely on position. */
    public void clickEditExercise(String name) {
        button("Edit " + name).click();
    }

    /** Deletes an exercise from its card's ••• menu; no confirmation, an Undo bar appears. */
    public void deleteExercise(String name) {
        chooseFromMenu("More actions for " + name, "Delete");
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
}
