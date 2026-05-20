package com.kavin.fitness.e2e.pages;

import com.microsoft.playwright.Page;

public class WeightModal {
    private final Page page;

    private static final String TITLE = ".modal-title";
    private static final String INPUT = ".modal-box input[type='number']";
    private static final String SAVE = ".modal-box >> button:has-text(\"Save\")";

    public WeightModal(Page page) {
        this.page = page;
    }

    public WeightModal waitUntilVisibleWithTitle(String expectedTitle) {
        page.locator(TITLE).waitFor();
        String actual = page.locator(TITLE).innerText();
        if (!actual.contains(expectedTitle)) {
            throw new AssertionError("Expected modal title to contain '" + expectedTitle + "' but got: " + actual);
        }
        return this;
    }

    public String getInputValue() {
        return page.locator(INPUT).inputValue();
    }

    public void enterWeight(String weight) {
        page.locator(INPUT).fill(weight);
    }

    public void save() {
        page.locator(SAVE).first().click();
    }
}
