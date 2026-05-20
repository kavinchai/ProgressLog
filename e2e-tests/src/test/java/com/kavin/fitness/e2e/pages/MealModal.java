package com.kavin.fitness.e2e.pages;

import com.microsoft.playwright.Page;

public class MealModal {
    private final Page page;

    private static final String TITLE = ".modal-title";
    private static final String NAME = ".modal-box input[placeholder*='optional' i]";
    private static final String CALORIES =
            ".modal-box .modal-form-row .modal-field:nth-child(1) input[type='number']";
    private static final String PROTEIN =
            ".modal-box .modal-form-row .modal-field:nth-child(2) input[type='number']";
    private static final String SAVE = ".modal-box >> button:has-text(\"Save\")";

    public MealModal(Page page) {
        this.page = page;
    }

    public MealModal waitUntilVisible() {
        page.locator(TITLE).waitFor();
        return this;
    }

    public void enterName(String name) {
        page.locator(NAME).fill(name);
    }

    public void enterCalories(String calories) {
        page.locator(CALORIES).fill(calories);
    }

    public void enterProtein(String protein) {
        page.locator(PROTEIN).fill(protein);
    }

    public void save() {
        page.locator(SAVE).first().click();
    }
}
