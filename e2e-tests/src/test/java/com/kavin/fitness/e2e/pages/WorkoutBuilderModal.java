package com.kavin.fitness.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;

public class WorkoutBuilderModal {
    private final Page page;

    private static final String TITLE = ".modal-title";
    private static final String SESSION_NAME = "input[placeholder*='push, pull, legs' i]";
    private static final String ADD_EXERCISE = ".modal-box >> button:has-text(\"+ Exercise\")";
    // Exact match — saves it from also catching a "Saving..." in-progress label.
    private static final String SAVE = ".modal-box >> button:text-is(\"Save\")";
    private static final String EXERCISE_NAME_INPUTS = "input[placeholder*='exercise name' i]";
    private static final String ADD_SET_BTNS = "button:has-text(\"+ Set\")";
    private static final String TYPE_SELECTS = ".wbm-type-select";

    public WorkoutBuilderModal(Page page) {
        this.page = page;
    }

    public WorkoutBuilderModal waitUntilVisible() {
        page.locator(TITLE).waitFor();
        String actual = page.locator(TITLE).innerText();
        if (!actual.contains("Log Workout") && !actual.contains("Edit Workout")) {
            throw new AssertionError("Expected 'Log Workout' or 'Edit Workout' modal but got: " + actual);
        }
        return this;
    }

    public String title() {
        return page.locator(TITLE).innerText();
    }

    public String exerciseNameValue(int idx) {
        return page.locator(EXERCISE_NAME_INPUTS).nth(idx).inputValue();
    }

    public void enterSessionName(String name) {
        page.locator(SESSION_NAME).fill(name);
    }

    public void clickAddExercise() {
        page.locator(ADD_EXERCISE).first().click();
    }

    /** Pick a type ("Lifting" | "Timed" | "Run") on the segmented control of the given exercise block. */
    public void selectType(int exerciseIdx, String label) {
        page.locator(TYPE_SELECTS).nth(exerciseIdx)
                .locator("button:text-is(\"" + label + "\")").click();
    }

    public void waitForExerciseCount(int count) {
        page.locator(EXERCISE_NAME_INPUTS).nth(count - 1).waitFor();
    }

    public void enterExerciseName(int idx, String name) {
        page.locator(EXERCISE_NAME_INPUTS).nth(idx).fill(name);
    }

    public void enterWeight(int idx, String weight) {
        page.locator(".wbm-set-row input[placeholder='0']").nth(idx * 2).fill(weight);
    }

    public void enterReps(int idx, String reps) {
        page.locator(".wbm-set-row input[placeholder='0']").nth(idx * 2 + 1).fill(reps);
    }

    public void enterDistance(int idx, String distance) {
        page.locator(".wbm-set-row--cardio input[placeholder='0']").nth(idx * 3).fill(distance);
    }

    public void enterRunMinutes(int idx, String minutes) {
        page.locator(".wbm-set-row--cardio input[placeholder='0']").nth(idx * 3 + 1).fill(minutes);
    }

    public void enterRunSeconds(int idx, String seconds) {
        page.locator(".wbm-set-row--cardio input[placeholder='0']").nth(idx * 3 + 2).fill(seconds);
    }

    public void enterDuration(int idx, String h, String m, String s) {
        Locator cardioInputs = page.locator(".wbm-set-row--cardio input[placeholder='0']");
        cardioInputs.nth(idx * 3).fill(h);
        cardioInputs.nth(idx * 3 + 1).fill(m);
        cardioInputs.nth(idx * 3 + 2).fill(s);
    }

    public void clickAddSet(int exerciseIdx) {
        page.locator(ADD_SET_BTNS).nth(exerciseIdx).click();
    }

    public void save() {
        page.locator(SAVE).first().click();
    }
}
