package com.kavin.fitness.e2e.pages;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import com.microsoft.playwright.options.BoundingBox;
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

    /** Type where the meal came from into the box's Restaurant field and leave it. */
    public void fillRestaurant(String label, String restaurant) {
        field(label, "Restaurant").fill(restaurant);
        field(label, "Restaurant").press("Tab");
    }

    /** Change a saved meal's restaurant and wait for the PUT that saves it to finish. */
    public void editRestaurant(String label, String restaurant) {
        page.waitForResponse(
                r -> r.url().contains("/meals/") && "PUT".equals(r.request().method()),
                () -> fillRestaurant(label, restaurant));
    }

    /** Retries until the box's Restaurant field shows {@code expected}. */
    public void assertRestaurant(String label, String expected) {
        assertThat(field(label, "Restaurant")).hasValue(expected);
    }

    /** True when the Restaurant field sits on the label's row, to its right (desktop layout). */
    public boolean restaurantIsRightOfLabel(String label) {
        BoundingBox name = card(label).locator(".meal-card-label").boundingBox();
        BoundingBox restaurant = field(label, "Restaurant").boundingBox();
        boolean sameRow = restaurant.y < name.y + name.height && name.y < restaurant.y + restaurant.height;
        return sameRow && restaurant.x >= name.x + name.width;
    }

    /** True when the Restaurant field sits on its own line right under the label, left-aligned (mobile layout). */
    public boolean restaurantIsBelowLabel(String label) {
        BoundingBox name = card(label).locator(".meal-card-label").boundingBox();
        BoundingBox restaurant = field(label, "Restaurant").boundingBox();
        BoundingBox whatYouAte = field(label, "What you ate").boundingBox();
        boolean underLabel = restaurant.y >= name.y + name.height - 1;
        boolean leftAligned = Math.abs(restaurant.x - name.x) <= 8;
        boolean aboveFields = restaurant.y + restaurant.height <= whatYouAte.y + 1;
        return underLabel && leftAligned && aboveFields;
    }

    /** Delete an extra meal, then press Undo in the dialog and wait for its box to come back. */
    public void deleteMealAndUndo(String label) {
        card(label).getByRole(AriaRole.BUTTON,
                new Locator.GetByRoleOptions().setName("Delete meal")).click();
        page.getByRole(AriaRole.BUTTON,
                new Page.GetByRoleOptions().setName("Confirm Delete")).click();
        page.getByText("Deleted successfully.").waitFor();
        card(label).waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.DETACHED));
        page.waitForResponse(
                r -> r.url().endsWith("/undo") && "POST".equals(r.request().method()),
                () -> page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Undo")).click());
        waitForCard(label);
    }
}
