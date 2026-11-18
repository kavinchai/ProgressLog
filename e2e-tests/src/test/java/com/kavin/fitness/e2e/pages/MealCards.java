package com.kavin.fitness.e2e.pages;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import com.microsoft.playwright.options.WaitForSelectorState;

/**
 * The meal rows in the Nutrition section (Today and the History day detail).
 * Breakfast / Lunch / Dinner always have a row ("+ Add" until logged); extra
 * meals get a row under their own name. Tapping a row opens the meal sheet,
 * which saves when you press Save at the top.
 */
public class MealCards {
    private final Page page;

    public MealCards(Page page) {
        this.page = page;
    }

    private Locator button(String name) {
        return page.getByRole(AriaRole.BUTTON,
                new Page.GetByRoleOptions().setName(name).setExact(true));
    }

    private Locator row(String label) {
        return page.locator(".meal-row:has(.status-row-title:text-is(\"" + label + "\"))");
    }

    private Locator sheet() {
        return page.locator(".modal-box");
    }

    private Locator field(String name) {
        return sheet().getByLabel(name, new Locator.GetByLabelOptions().setExact(true));
    }

    private void saveSheet() {
        sheet().locator(".modal-header-save").click();
        sheet().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.DETACHED));
    }

    private void fillFields(String name, String calories, String protein) {
        field("What you ate").fill(name);
        field("Calories").fill(calories);
        field("Protein (g)").fill(protein);
    }

    public void waitForRow(String label) {
        row(label).waitFor();
    }

    /** Taps "+ Add {slot}", fills the sheet and saves it. */
    public void logMeal(String slot, String name, String calories, String protein) {
        button("+ Add " + slot).click();
        fillFields(name, calories, protein);
        saveSheet();
    }

    /** Taps "+ Add {slot}", ticks "Skipped {slot}" and saves the sheet. */
    public void skipMeal(String slot) {
        button("+ Add " + slot).click();
        sheet().getByRole(AriaRole.CHECKBOX, new Locator.GetByRoleOptions()
                .setName("Skipped " + slot.toLowerCase()).setExact(true)).check();
        saveSheet();
    }

    /** "+ Add meal": names the meal, fills it and saves it. */
    public void addExtraMeal(String label, String name, String calories, String protein) {
        button("+ Add meal").click();
        field("Meal name").fill(label);
        fillFields(name, calories, protein);
        saveSheet();
        waitForRow(label);
    }

    /** Retries until the row's one-line summary shows {@code expected}. */
    public void assertRowDetail(String label, String expected) {
        assertThat(row(label).locator(".status-row-detail")).hasText(expected);
    }

    /** Deletes a meal from its row's ••• menu; no confirmation, an Undo bar appears. */
    public void deleteMeal(String label) {
        button("More actions for " + label).click();
        page.getByRole(AriaRole.MENUITEM,
                new Page.GetByRoleOptions().setName("Delete").setExact(true)).click();
        button("Edit " + label).waitFor(
                new Locator.WaitForOptions().setState(WaitForSelectorState.DETACHED));
    }

    /** Deletes a meal, then presses Undo and waits for its row to come back. */
    public void deleteMealAndUndo(String label) {
        deleteMeal(label);
        page.waitForResponse(
                r -> r.url().endsWith("/undo") && "POST".equals(r.request().method()),
                () -> button("Undo").click());
        button("Edit " + label).waitFor();
    }

    /** Opens a logged meal, sets where it came from and waits for the PUT that saves it. */
    public void setRestaurant(String label, String restaurant) {
        button("Edit " + label).click();
        field("Restaurant").fill(restaurant);
        page.waitForResponse(
                r -> r.url().contains("/meals/") && "PUT".equals(r.request().method()),
                this::saveSheet);
    }

    /** Opens a logged meal, checks its Restaurant field, then closes the sheet with Cancel. */
    public void assertRestaurant(String label, String expected) {
        button("Edit " + label).click();
        assertThat(field("Restaurant")).hasValue(expected);
        sheet().getByRole(AriaRole.BUTTON,
                new Locator.GetByRoleOptions().setName("Cancel")).click();
        sheet().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.DETACHED));
    }
}
