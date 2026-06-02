package com.kavin.fitness.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;

public class EditExerciseModal {
    private final Page page;

    private static final String TITLE = ".modal-title";
    private static final String SAVE = ".modal-box >> button:text-is(\"Save\")";
    private static final String DELETE = ".modal-box >> button:has-text(\"Delete\")";

    public EditExerciseModal(Page page) {
        this.page = page;
    }

    public EditExerciseModal waitUntilTitleContains(String expected) {
        page.locator(TITLE).waitFor();
        String actual = page.locator(TITLE).innerText();
        if (!actual.contains(expected)) {
            throw new AssertionError("Expected title to contain '" + expected + "' but got: " + actual);
        }
        return this;
    }

    public void editWeight(int setIdx, String weight) {
        page.locator(".modal-box .wbm-set-row .wbm-set-input").nth(setIdx * 2).fill(weight);
    }

    public void editDistance(int setIdx, String distance) {
        page.locator(".modal-box .wbm-set-row--cardio input[placeholder='0']").nth(setIdx * 3).fill(distance);
    }

    public void editMinutes(int setIdx, String minutes) {
        page.locator(".modal-box .wbm-set-row--cardio input[placeholder='0']").nth(setIdx * 3 + 1).fill(minutes);
    }

    public void save() {
        page.locator(SAVE).first().click();
    }

    /**
     * Delete the exercise via the inline confirmation flow:
     * click "Delete Exercise" → click "Confirm Delete" → click "Done".
     */
    public void deleteExercise() {
        page.locator(DELETE).first().click();
        page.locator(".modal-box >> button:has-text(\"Confirm Delete\")").click();
        Locator done = page.locator(".modal-box >> button:has-text(\"Done\")");
        done.waitFor(new Locator.WaitForOptions().setTimeout(30000));
        done.click();
    }
}
