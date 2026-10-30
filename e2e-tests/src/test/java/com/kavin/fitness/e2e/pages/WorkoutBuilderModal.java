package com.kavin.fitness.e2e.pages;

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

    public void clickAddSet(int exerciseIdx) {
        page.locator(ADD_SET_BTNS).nth(exerciseIdx).click();
    }

    public void save() {
        page.locator(SAVE).first().click();
    }
}
