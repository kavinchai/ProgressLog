package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.SettingsPage;
import com.kavin.fitness.e2e.support.BaseTest;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

public class SettingsPageTest extends BaseTest {
    private SettingsPage settings;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        settings = new SettingsPage(page);
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

    // Save is only enabled when a value changed, so pick a training target
    // that differs from whatever an earlier run left behind.
    private String savedTraining;

    @Test(priority = 6)
    public void updateGoalsAndSave() {
        savedTraining = "2500".equals(settings.getTrainingCalories()) ? "2550" : "2500";

        step("enter new goals: training " + savedTraining + ", rest 2000, protein 180");
        settings.enterTrainingCalories(savedTraining);
        settings.enterRestCalories("2000");
        settings.enterProteinTarget("180");

        step("click Save goals");
        settings.clickSaveGoals();

        step("verify 'Saved!' message appears");
        settings.waitForSavedMessage();
    }

    @Test(priority = 7, dependsOnMethods = "updateGoalsAndSave")
    public void goalsPersistedAfterRefresh() {
        step("refresh the settings page");
        settings.open(baseUrl);

        step("verify goals persisted");
        page.waitForCondition(() -> !"".equals(settings.getTrainingCalories()));
        String training = settings.getTrainingCalories();
        String rest = settings.getRestCalories();
        String protein = settings.getProteinTarget();
        if (!savedTraining.equals(training)) {
            throw new AssertionError("Expected training calories '" + savedTraining + "' but got: " + training);
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

    @Test(priority = 8, dependsOnMethods = "weightUnitToggleSwitchesUnit")
    public void weightUnitToggleWorksFromKeyboard() {
        step("get current active unit");
        String initial = settings.getActiveWeightUnit();
        String other = "lbs".equals(initial) ? "kg" : "lbs";

        step("press Enter on the focused, unselected unit");
        settings.pressOnUnitToggle("Enter");
        settings.waitForActiveUnit(other);

        step("press Space on the other unit to switch back");
        settings.pressOnUnitToggle("Space");
        settings.waitForActiveUnit(initial);
    }

    @Test(priority = 9)
    public void claudeIntegrationButtonVisible() {
        step("verify Claude setup button is visible");
        if (!settings.isClaudeSetupButtonVisible()) {
            throw new AssertionError("Expected Claude integration button to be visible");
        }
    }

    @Test(priority = 10)
    public void themeChoiceAppliesDarkMode() {
        String initial = settings.getActiveTheme();

        step("choose Dark");
        settings.chooseTheme("Dark");
        settings.waitForDarkClass(true);

        step("choose Light");
        settings.chooseTheme("Light");
        settings.waitForDarkClass(false);

        step("restore the original theme (" + initial + ")");
        settings.chooseTheme(initial);
    }

    @Test(priority = 11)
    public void accountRowOpensFormAndCancelCloses() {
        step("open the Password row");
        settings.openAccountRow("Password");
        if (!settings.isFieldVisible("Confirm new password")) {
            throw new AssertionError("Expected the password form to open under its row");
        }

        step("opening Username closes Password");
        settings.openAccountRow("Username");
        if (!settings.isFieldVisible("New username")) {
            throw new AssertionError("Expected the username form to open");
        }
        if (!settings.waitForAccountRowClosed("Password")) {
            throw new AssertionError("Expected the Password row to close");
        }

        step("Cancel closes the form");
        settings.cancelOpenForm();
        if (!settings.waitForAccountRowClosed("Username")) {
            throw new AssertionError("Expected the Username row to close after Cancel");
        }
    }

    @Test(priority = 12)
    public void phoneOpensGoalsInBottomSheet() {
        step("switch to phone width and reload");
        page.setViewportSize(390, 844);
        try {
            settings.open(baseUrl);

            step("open the goals row");
            if (!settings.isGoalsFormInDialog()) {
                throw new AssertionError("Expected the goals form in a bottom-sheet dialog on phones");
            }
        } finally {
            page.setViewportSize(1920, 1080);
        }
    }
}
