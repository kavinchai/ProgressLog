package com.kavin.fitness.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import com.microsoft.playwright.options.WaitForSelectorState;

/**
 * Settings is a grouped list of rows. Typed edits (goals, username, email,
 * password) open under their row on desktop, or in a bottom-sheet dialog on
 * phones; unit and theme are segmented choices; privacy rows have switches.
 */
public class SettingsPage {
    private final Page page;

    private static final String PAGE_TITLE = ".settings-title";
    private static final String GOALS_ROW = "button.settings-row-button:has-text(\"Calorie & protein goals\")";
    private static final String TRAINING_INPUT = "#calorieTargetTraining";
    private static final String REST_INPUT = "#calorieTargetRest";
    private static final String PROTEIN_INPUT = "#proteinTarget";
    private static final String SAVE_GOALS = "button:has-text(\"Save goals\")";
    private static final String SAVED_MESSAGE = ".settings-saved:has-text(\"Saved!\")";
    private static final String UNIT_GROUP = "[role='group'][aria-label='Weight unit']";
    private static final String THEME_GROUP = "[role='group'][aria-label='Theme']";
    private static final String CLAUDE_SETUP_BTN = "button:has-text(\"Claude integration\")";

    public SettingsPage(Page page) {
        this.page = page;
    }

    private boolean awaitVisible(String selector) {
        try {
            page.locator(selector).first().waitFor(
                    new Locator.WaitForOptions().setTimeout(5000));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private static String groupTitle(String title) {
        return "h2.settings-group-title:has-text(\"" + title + "\")";
    }

    public void open(String baseUrl) {
        page.navigate(baseUrl + "/settings");
        page.locator(PAGE_TITLE).waitFor();
    }

    public String getPageTitle() {
        return page.locator(PAGE_TITLE).innerText();
    }

    public boolean isGoalsSectionVisible() {
        return awaitVisible(groupTitle("Goals"));
    }

    public boolean isPreferencesSectionVisible() {
        return awaitVisible(groupTitle("Preferences"));
    }

    public boolean isIntegrationsSectionVisible() {
        return awaitVisible(groupTitle("Integrations"));
    }

    // ── Goals row ────────────────────────────────────────────────────────────

    /** Opens the goals row (enabled once goals have loaded) unless it's open. */
    private void ensureGoalsOpen() {
        Locator row = page.locator(GOALS_ROW);
        if (!"true".equals(row.getAttribute("aria-expanded"))) {
            page.locator(GOALS_ROW + ":not([disabled])").click();
        }
        page.locator(TRAINING_INPUT).waitFor();
    }

    public void enterTrainingCalories(String value) {
        ensureGoalsOpen();
        page.locator(TRAINING_INPUT).fill(value);
    }

    public void enterRestCalories(String value) {
        ensureGoalsOpen();
        page.locator(REST_INPUT).fill(value);
    }

    public void enterProteinTarget(String value) {
        ensureGoalsOpen();
        page.locator(PROTEIN_INPUT).fill(value);
    }

    public String getTrainingCalories() {
        ensureGoalsOpen();
        return page.locator(TRAINING_INPUT).inputValue();
    }

    public String getRestCalories() {
        ensureGoalsOpen();
        return page.locator(REST_INPUT).inputValue();
    }

    public String getProteinTarget() {
        ensureGoalsOpen();
        return page.locator(PROTEIN_INPUT).inputValue();
    }

    public void clickSaveGoals() {
        page.locator(SAVE_GOALS).click();
    }

    public void waitForSavedMessage() {
        page.locator(SAVED_MESSAGE).waitFor();
    }

    /** True while the goals form is open — on phones that's inside a dialog. */
    public boolean isGoalsFormInDialog() {
        ensureGoalsOpen();
        return awaitVisible("[role='dialog'] " + TRAINING_INPUT);
    }

    // ── Weight unit (lbs | kg) ───────────────────────────────────────────────

    public String getActiveWeightUnit() {
        Locator active = page.locator(UNIT_GROUP + " button[aria-pressed='true']");
        return active.count() == 0 ? "" : active.first().innerText();
    }

    /** Picks the unit that isn't selected. */
    public void clickUnitToggle() {
        page.locator(UNIT_GROUP + " button[aria-pressed='false']").click();
    }

    /** Focuses the unselected unit and presses a key on it (no mouse). */
    public void pressOnUnitToggle(String key) {
        Locator other = page.locator(UNIT_GROUP + " button[aria-pressed='false']");
        other.focus();
        other.press(key);
    }

    public void waitForActiveUnit(String unit) {
        page.locator(UNIT_GROUP + " button[aria-pressed='true']:has-text(\"" + unit + "\")").waitFor();
    }

    // ── Theme (Light | Dark | System) ───────────────────────────────────────

    public String getActiveTheme() {
        return page.locator(THEME_GROUP + " button[aria-pressed='true']").innerText();
    }

    public void chooseTheme(String label) {
        page.locator(THEME_GROUP).getByRole(AriaRole.BUTTON,
                new Locator.GetByRoleOptions().setName(label).setExact(true)).click();
    }

    public void waitForDarkClass(boolean dark) {
        page.locator(dark ? "html.dark" : "html:not(.dark)").waitFor(
                new Locator.WaitForOptions().setState(WaitForSelectorState.ATTACHED));
    }

    public boolean isClaudeSetupButtonVisible() {
        return awaitVisible(CLAUDE_SETUP_BTN);
    }

    // ── Account rows ─────────────────────────────────────────────────────────

    private Locator accountRow(String label) {
        return page.locator("button.settings-row-button", new Page.LocatorOptions().setHas(
                page.locator(".settings-row-label", new Page.LocatorOptions().setHasText(label))));
    }

    public void openAccountRow(String label) {
        accountRow(label).click();
    }

    /** Waits until the row reports it is closed; false if it stays open. */
    public boolean waitForAccountRowClosed(String label) {
        try {
            accountRow(label).and(page.locator("[aria-expanded='false']")).waitFor(
                    new Locator.WaitForOptions().setTimeout(5000));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isFieldVisible(String label) {
        try {
            page.getByLabel(label, new Page.GetByLabelOptions().setExact(true)).waitFor(
                    new Locator.WaitForOptions().setTimeout(5000));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public void cancelOpenForm() {
        page.getByRole(AriaRole.BUTTON,
                new Page.GetByRoleOptions().setName("Cancel").setExact(true)).click();
    }

    // ── Privacy / share-data switch ─────────────────────────────────────────

    private static final String SHARE_DATA_TOGGLE = "button.settings-switch[aria-label='Toggle data sharing']";
    private static final String PRIVACY_SAVING = ".settings-saved:has-text(\"Saving\")";

    public boolean isPrivacySectionVisible() {
        return awaitVisible(groupTitle("Privacy"));
    }

    private static String switchState(Locator toggle) {
        if (toggle.count() == 0) return "";
        return "true".equals(toggle.first().getAttribute("aria-pressed")) ? "On" : "Off";
    }

    private static String switchWithState(String toggle, String expectedLabel) {
        return toggle + "[aria-pressed='" + ("On".equals(expectedLabel) ? "true" : "false") + "']";
    }

    public String getShareDataState() {
        return switchState(page.locator(SHARE_DATA_TOGGLE));
    }

    public void clickShareDataToggle() {
        page.locator(SHARE_DATA_TOGGLE).click();
    }

    public void waitForShareDataState(String expectedLabel) {
        page.locator(switchWithState(SHARE_DATA_TOGGLE, expectedLabel)).waitFor(
                new Locator.WaitForOptions().setTimeout(5000));
    }

    public void waitForPrivacySaveComplete() {
        Locator saving = page.locator(PRIVACY_SAVING);
        if (saving.count() > 0) {
            saving.first().waitFor(new Locator.WaitForOptions()
                    .setState(WaitForSelectorState.HIDDEN)
                    .setTimeout(5000));
        }
    }

    // ── Share-calendar switch ───────────────────────────────────────────────

    private static final String CALENDAR_TOGGLE = "button.settings-switch[aria-label='Toggle calendar sharing']";

    public String getShareCalendarState() {
        return switchState(page.locator(CALENDAR_TOGGLE));
    }

    public void clickShareCalendarToggle() {
        page.locator(CALENDAR_TOGGLE).click();
    }

    public void waitForShareCalendarState(String expectedLabel) {
        page.locator(switchWithState(CALENDAR_TOGGLE, expectedLabel)).waitFor(
                new Locator.WaitForOptions().setTimeout(5000));
    }
}
