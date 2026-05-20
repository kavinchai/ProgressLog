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
    private static final String UNIT_TOGGLE = ".unit-toggle";
    private static final String ACTIVE_UNIT = ".unit-toggle-label.active";
    private static final String CLAUDE_SETUP_BTN = "button:has-text(\"Claude integration\")";

    public SettingsPage(Page page) {
        this.page = page;
    }

    public void open(String baseUrl) {
        page.navigate(baseUrl + "/settings");
        page.locator(PAGE_TITLE).waitFor();
    }

    public String getPageTitle() {
        return page.locator(PAGE_TITLE).innerText();
    }

    public boolean isGoalsSectionVisible() {
        return page.locator(GOALS_SECTION).count() > 0;
    }

    public boolean isPreferencesSectionVisible() {
        return page.locator(PREFERENCES_SECTION).count() > 0;
    }

    public boolean isIntegrationsSectionVisible() {
        return page.locator(INTEGRATIONS_SECTION).count() > 0;
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
        return page.locator(CLAUDE_SETUP_BTN).count() > 0;
    }
}
