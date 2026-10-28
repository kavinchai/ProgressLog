package com.kavin.fitness.e2e.pages;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import com.microsoft.playwright.options.WaitForSelectorState;

/**
 * The stacked meal boxes in the Nutrition section (Today and the History day
 * detail). Each box is a role="group" named after its label; boxes save
 * themselves when a field loses focus.
 */
public class MealCards {
    private final Page page;

    public MealCards(Page page) {
        this.page = page;
    }

    private Locator card(String label) {
        return page.getByRole(AriaRole.GROUP,
                new Page.GetByRoleOptions().setName(label).setExact(true));
    }

    private Locator field(String label, String fieldName) {
        return card(label).getByLabel(fieldName, new Locator.GetByLabelOptions().setExact(true));
    }

    public void waitForCard(String label) {
        card(label).waitFor();
    }

    /** Fill what was eaten, kcal and protein, then leave the box so it saves. */
    public void fillMeal(String label, String name, String calories, String protein) {
        field(label, "What you ate").fill(name);
        field(label, "Calories").fill(calories);
        field(label, "Protein (g)").fill(protein);
        field(label, "Protein (g)").press("Tab");
    }

    /**
     * Waits for the box's "Saved" status. Only reliable for a box's first save:
     * after that an earlier "Saved" may still be showing, so wait on the totals
     * instead.
     */
    public void waitForFirstSave(String label) {
        card(label).locator(".meal-card-status", new Locator.LocatorOptions().setHasText("Saved"))
                .waitFor();
    }

    /** Retries until the box shows {@code expected} — boxes render before data loads. */
    public void assertWhatYouAte(String label, String expected) {
        assertThat(field(label, "What you ate")).hasValue(expected);
    }

    public void toggleSkipped(String label) {
        card(label).getByRole(AriaRole.CHECKBOX,
                new Locator.GetByRoleOptions().setName("Skipped")).click();
    }

    public void assertSkipped(String label) {
        assertThat(card(label).getByRole(AriaRole.CHECKBOX,
                new Locator.GetByRoleOptions().setName("Skipped"))).isChecked();
    }

    public void waitForSkippedSummary(String label) {
        card(label).locator(".meal-card-skipped-text",
                new Locator.LocatorOptions().setHasText("Skipped " + label)).waitFor();
    }

    /** Click "+ Add meal", type the label into the (auto-focused) label field and press Enter. */
    public void addMeal(String label) {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("+ Add meal")).click();
        Locator labelInput = page.getByLabel("Meal label",
                new Page.GetByLabelOptions().setExact(true)).last();
        assertThat(labelInput).isFocused();
        labelInput.fill(label);
        labelInput.press("Enter");
        waitForCard(label);
    }

    public void deleteMeal(String label) {
        card(label).getByRole(AriaRole.BUTTON,
                new Locator.GetByRoleOptions().setName("Delete meal")).click();
        page.getByRole(AriaRole.BUTTON,
                new Page.GetByRoleOptions().setName("Confirm Delete")).click();
        page.getByText("Deleted successfully.").waitFor();
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Done")).click();
        card(label).waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.DETACHED));
    }
}
