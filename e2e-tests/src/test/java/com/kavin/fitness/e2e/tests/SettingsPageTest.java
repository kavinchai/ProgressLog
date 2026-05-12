package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.SettingsPage;
import com.kavin.fitness.e2e.support.BaseTest;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

public class SettingsPageTest extends BaseTest {
    private SettingsPage settings;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        settings = new SettingsPage(driver);
        settings.open(baseUrl);
    }

    @Test(priority = 1)
    public void settingsPageLoadsWithTitle() {
        step("verify page title is 'Settings'");
        String title = settings.getPageTitle();
        if (!"Settings".equals(title)) {
            throw new AssertionError("Expected 'Settings' but got: " + title);
        }
    }

    @Test(priority = 2)
    public void settingsShowsGoalsSection() {
        step("verify Goals section is visible");
        if (!settings.isGoalsSectionVisible()) {
            throw new AssertionError("Expected Goals section to be visible");
        }
    }

    @Test(priority = 3)
    public void settingsShowsPreferencesSection() {
        step("verify Preferences section is visible");
        if (!settings.isPreferencesSectionVisible()) {
            throw new AssertionError("Expected Preferences section to be visible");
        }
    }

    @Test(priority = 4)
    public void settingsShowsIntegrationsSection() {
        step("verify Integrations section is visible");
        if (!settings.isIntegrationsSectionVisible()) {
            throw new AssertionError("Expected Integrations section to be visible");
        }
    }

    @Test(priority = 5)
    public void goalsFormHasRequiredFields() {
        step("verify training, rest, and protein inputs exist");
        String training = settings.getTrainingCalories();
        String rest = settings.getRestCalories();
        String protein = settings.getProteinTarget();
        if (training == null || rest == null || protein == null) {
            throw new AssertionError("Expected goals fields to have values");
        }
    }

    @Test(priority = 6)
    public void updateGoalsAndSave() {
        step("enter new goals: training 2500, rest 2000, protein 180");
        settings.enterTrainingCalories("2500");
        settings.enterRestCalories("2000");
        settings.enterProteinTarget("180");

        step("click Save Goals");
        settings.clickSaveGoals();

        step("verify 'Saved!' message appears");
        settings.waitForSavedMessage();
    }

    @Test(priority = 7, dependsOnMethods = "updateGoalsAndSave")
    public void goalsPersistedAfterRefresh() {
        step("refresh the settings page");
        settings.open(baseUrl);

        step("verify goals persisted");
        wait.until(d -> !"".equals(settings.getTrainingCalories()));
        String training = settings.getTrainingCalories();
        String rest = settings.getRestCalories();
        String protein = settings.getProteinTarget();
        if (!"2500".equals(training)) {
            throw new AssertionError("Expected training calories '2500' but got: " + training);
        }
        if (!"2000".equals(rest)) {
            throw new AssertionError("Expected rest calories '2000' but got: " + rest);
        }
        if (!"180".equals(protein)) {
            throw new AssertionError("Expected protein target '180' but got: " + protein);
        }
    }

    @Test(priority = 8)
    public void weightUnitToggleSwitchesUnit() {
        step("get current active unit");
        String initial = settings.getActiveWeightUnit();

        step("click unit toggle");
        settings.clickUnitToggle();

        step("verify unit changed");
        String expected = "lbs".equals(initial) ? "kg" : "lbs";
        settings.waitForActiveUnit(expected);

        step("toggle back");
        settings.clickUnitToggle();
        settings.waitForActiveUnit(initial);
    }

    @Test(priority = 9)
    public void claudeIntegrationButtonVisible() {
        step("verify Claude setup button is visible");
        if (!settings.isClaudeSetupButtonVisible()) {
            throw new AssertionError("Expected Claude integration button to be visible");
        }
    }
}
