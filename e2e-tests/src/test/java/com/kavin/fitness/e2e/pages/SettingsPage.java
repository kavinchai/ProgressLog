package com.kavin.fitness.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;

public class SettingsPage {
    private final Page page;

    private static final String PAGE_TITLE = ".settings-title";
    private static final String GOALS_SECTION = "h2.settings-card-title:has-text(\"Goals\")";
    private static final String PREFERENCES_SECTION = "h2.settings-card-title:has-text(\"Preferences\")";
    private static final String INTEGRATIONS_SECTION = "h2.settings-card-title:has-text(\"Integrations\")";
    private static final String TRAINING_INPUT = "#calorieTargetTraining";
    private static final String REST_INPUT = "#calorieTargetRest";
    private static final String PROTEIN_INPUT = "#proteinTarget";
    private static final String SAVE_GOALS = "button.btn-primary:has-text(\"Save Goals\")";
    private static final String SAVED_MESSAGE = ".settings-saved";
    private static final String UNIT_TOGGLE = ".unit-toggle[aria-label='Toggle weight unit']";
    private static final String ACTIVE_UNIT = ".unit-toggle-label.active";
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

    public void open(String baseUrl) {
        page.navigate(baseUrl + "/settings");
        page.locator(PAGE_TITLE).waitFor();
    }

    public String getPageTitle() {
        return page.locator(PAGE_TITLE).innerText();
    }

    public boolean isGoalsSectionVisible() {
        return awaitVisible(GOALS_SECTION);
    }

    public boolean isPreferencesSectionVisible() {
        return awaitVisible(PREFERENCES_SECTION);
    }

    public boolean isIntegrationsSectionVisible() {
        return awaitVisible(INTEGRATIONS_SECTION);
    }

    public void enterTrainingCalories(String value) {
        page.locator(TRAINING_INPUT).fill(value);
    }

    public void enterRestCalories(String value) {
        page.locator(REST_INPUT).fill(value);
    }

    public void enterProteinTarget(String value) {
        page.locator(PROTEIN_INPUT).fill(value);
    }

    public String getTrainingCalories() {
        return page.locator(TRAINING_INPUT).inputValue();
    }

    public String getRestCalories() {
        return page.locator(REST_INPUT).inputValue();
    }

    public String getProteinTarget() {
        return page.locator(PROTEIN_INPUT).inputValue();
    }

    public void clickSaveGoals() {
        page.locator(SAVE_GOALS).click();
    }

    public void waitForSavedMessage() {
        page.locator(SAVED_MESSAGE).waitFor();
    }

    public String getActiveWeightUnit() {
        Locator active = page.locator(ACTIVE_UNIT);
        return active.count() == 0 ? "" : active.first().innerText();
    }

    public void clickUnitToggle() {
        page.locator(UNIT_TOGGLE).click();
    }

    public void waitForActiveUnit(String unit) {
        page.locator(ACTIVE_UNIT + ":has-text(\"" + unit + "\")").waitFor();
    }

    public boolean isClaudeSetupButtonVisible() {
        return awaitVisible(CLAUDE_SETUP_BTN);
    }

    // ── Privacy / share-data toggle ─────────────────────────────────────────

    private static final String PRIVACY_SECTION = "h2.settings-card-title:has-text(\"Privacy\")";
    private static final String SHARE_DATA_TOGGLE = "div.unit-toggle[aria-label='Toggle data sharing']";
    private static final String SHARE_DATA_ACTIVE_LABEL = SHARE_DATA_TOGGLE + " .unit-toggle-label.active";
    private static final String PRIVACY_SAVING = ".settings-saved:has-text(\"Saving\")";

    public boolean isPrivacySectionVisible() {
        return awaitVisible(PRIVACY_SECTION);
    }

    public String getShareDataState() {
        Locator active = page.locator(SHARE_DATA_ACTIVE_LABEL);
        return active.count() == 0 ? "" : active.first().innerText();
    }

    public void clickShareDataToggle() {
        page.locator(SHARE_DATA_TOGGLE).click();
    }

    public void waitForShareDataState(String expectedLabel) {
        page.locator(SHARE_DATA_ACTIVE_LABEL + ":has-text(\"" + expectedLabel + "\")").waitFor(
                new Locator.WaitForOptions().setTimeout(5000));
    }

    public void waitForPrivacySaveComplete() {
        Locator saving = page.locator(PRIVACY_SAVING);
        if (saving.count() > 0) {
            saving.first().waitFor(new Locator.WaitForOptions()
                    .setState(com.microsoft.playwright.options.WaitForSelectorState.HIDDEN)
                    .setTimeout(5000));
        }
    }
}
