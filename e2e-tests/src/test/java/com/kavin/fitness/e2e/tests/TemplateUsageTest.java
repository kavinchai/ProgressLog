package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.TemplatesPage;
import com.kavin.fitness.e2e.pages.TodayPage;
import com.kavin.fitness.e2e.pages.WorkoutBuilderModal;
import com.kavin.fitness.e2e.support.BaseTest;
import org.openqa.selenium.By;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

/**
 * The existing TemplatesPageTest only covers template name CRUD. This class
 * exercises the more important user flow: create a template with exercises,
 * click "Use" to open the workout builder pre-filled, and save → today shows
 * the workout. This is the value prop of templates.
 */
public class TemplateUsageTest extends BaseTest {
    private TemplatesPage templates;
    private WorkoutBuilderModal workout;
    private TodayPage today;

    private static final String TEMPLATE_NAME = "E2E Use Template";
    private static final String EXERCISE_NAME = "Template E2E Press";

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        templates = new TemplatesPage(driver);
        workout   = new WorkoutBuilderModal(driver);
        today     = new TodayPage(driver);

        // Make sure today's workout slot is empty so "Use" creates a clean session
        navigateToToday();
        today.deleteWorkoutIfExists();
        templates.open(baseUrl);
    }

    @AfterClass(alwaysRun = true)
    public void cleanup() {
        // Best-effort cleanup so re-runs work. Don't fail the suite if anything
        // here throws — the @AfterClass on BaseTest still runs to quit driver.
        try {
            templates.open(baseUrl);
            if (templates.isTemplateVisible(TEMPLATE_NAME)) {
                templates.clickDeleteTemplate(TEMPLATE_NAME);
            }
        } catch (Exception ignored) {}
    }

    @Test(priority = 1)
    public void createTemplateWithExercises() {
        step("click + New, enter template name + one exercise");
        templates.clickNewTemplate();
        templates.waitForModalVisible("New Template");
        templates.enterTemplateName(TEMPLATE_NAME);

        // The TemplateBuilderModal uses ExerciseListEditor, same component the
        // WorkoutBuilderModal uses. The exercise list starts empty — click the
        // "+ Exercise" button inside the modal to add a row, then fill fields.
        step("add a lifting exercise to the template");
        clickAddExerciseInModal();
        enterFirstExerciseName(EXERCISE_NAME);
        enterFirstWeight("100");
        enterFirstReps("5");

        step("save template");
        templates.clickModalSave();
        waitForModalClosed();

        step("verify template appears in the list");
        templates.waitForTemplateVisible(TEMPLATE_NAME);
    }

    @Test(priority = 2, dependsOnMethods = "createTemplateWithExercises")
    public void useTemplatePrefillsWorkoutBuilderAndSaves() {
        step("click Use on the template");
        templates.clickUseTemplate(TEMPLATE_NAME);
        workout.waitUntilVisible();

        step("verify the exercise name from the template is prefilled");
        // The first exercise-name input on the WorkoutBuilderModal should match
        // what we put on the template.
        String prefilled = driver.findElements(
                By.cssSelector("input[placeholder*='exercise name' i]"))
                .get(0).getAttribute("value");
        if (!EXERCISE_NAME.equals(prefilled)) {
            throw new AssertionError(
                    "Expected exercise name '" + EXERCISE_NAME + "' prefilled, got: '" + prefilled + "'");
        }

        step("save workout from prefilled builder");
        workout.save();
        waitForModalClosed();

        step("navigate to Today and verify workout is present");
        navigateToToday();
        today.waitForExercise(EXERCISE_NAME);
    }

    @Test(priority = 3, dependsOnMethods = "useTemplatePrefillsWorkoutBuilderAndSaves")
    public void cleanupCreatedWorkout() {
        step("delete the workout we created from the template (test isolation)");
        navigateToToday();
        today.deleteWorkoutIfExists();
    }

    // ── helpers ─ shared selectors that are simpler inline than a new page object ──

    private void clickAddExerciseInModal() {
        // The button text is "+ Exercise" — case-insensitive XPath.
        driver.findElement(By.xpath(
                "//div[contains(@class,'modal')]" +
                "//button[contains(translate(text()," +
                "'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'+ exercise')]"))
                .click();
        wait.until(d -> !d.findElements(
                By.cssSelector("input[placeholder*='exercise name' i]")).isEmpty());
    }

    private void enterFirstExerciseName(String name) {
        var el = driver.findElements(By.cssSelector("input[placeholder*='exercise name' i]")).get(0);
        el.clear();
        el.sendKeys(name);
    }

    private void enterFirstWeight(String weight) {
        var el = driver.findElements(By.cssSelector(".wbm-set-row input[placeholder='0']")).get(0);
        el.clear();
        el.sendKeys(weight);
    }

    private void enterFirstReps(String reps) {
        var el = driver.findElements(By.cssSelector(".wbm-set-row input[placeholder='0']")).get(1);
        el.clear();
        el.sendKeys(reps);
    }
}
