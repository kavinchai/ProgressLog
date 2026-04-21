package com.kavin.fitness.e2e.pages;

import com.qmetry.qaf.automation.core.ConfigurationManager;
import com.qmetry.qaf.automation.ui.WebDriverBaseTestPage;
import com.qmetry.qaf.automation.ui.annotations.FindBy;
import com.qmetry.qaf.automation.ui.api.PageLocator;
import com.qmetry.qaf.automation.ui.api.WebDriverTestPage;
import com.qmetry.qaf.automation.ui.webdriver.QAFExtendedWebElement;
import com.qmetry.qaf.automation.ui.webdriver.QAFWebElement;

import java.util.List;

public class TodayPage extends WebDriverBaseTestPage<WebDriverTestPage> {

    @FindBy(locator = "today.weight.value")
    private QAFExtendedWebElement weightValue;

    @FindBy(locator = "today.weight.addBtn")
    private QAFExtendedWebElement weightAddBtn;

    @FindBy(locator = "today.weight.editBtn")
    private QAFExtendedWebElement weightEditBtn;

    @FindBy(locator = "today.steps.value")
    private QAFExtendedWebElement stepsValue;

    @FindBy(locator = "today.steps.addBtn")
    private QAFExtendedWebElement stepsAddBtn;

    @FindBy(locator = "today.steps.editBtn")
    private QAFExtendedWebElement stepsEditBtn;

    @FindBy(locator = "today.steps.deleteBtn")
    private QAFExtendedWebElement stepsDeleteBtn;

    @FindBy(locator = "today.steps.input")
    private QAFExtendedWebElement stepsInput;

    @FindBy(locator = "today.steps.saveBtn")
    private QAFExtendedWebElement stepsSaveBtn;

    @FindBy(locator = "today.nutrition.addMealBtn")
    private QAFExtendedWebElement addMealBtn;

    @FindBy(locator = "today.workout.addBtn")
    private QAFExtendedWebElement workoutAddBtn;

    @FindBy(locator = "today.workout.sessionName")
    private QAFExtendedWebElement workoutSessionName;

    @FindBy(locator = "today.workout.renameBtn")
    private QAFExtendedWebElement workoutRenameBtn;

    @FindBy(locator = "today.workout.deleteBtn")
    private QAFExtendedWebElement workoutDeleteBtn;

    @FindBy(locator = "today.exercise.list")
    private QAFExtendedWebElement exerciseList;

    @FindBy(locator = "today.exercise.items")
    private List<QAFWebElement> exerciseItems;

    @FindBy(locator = "today.exercise.editBtns")
    private List<QAFWebElement> exerciseEditBtns;

    @Override
    protected void openPage(PageLocator locator, Object... args) {
        driver.get(getBaseUrl() + "/");
    }

    private String getBaseUrl() {
        return ConfigurationManager.getBundle().getString("env.baseurl", "http://localhost:5173");
    }

    // ── Weight actions ───────────────────────────────────────────────────────

    public void clickAddWeight() {
        weightAddBtn.click();
    }

    public void clickEditWeight() {
        weightEditBtn.click();
    }

    public String getWeightValue() {
        return weightValue.getText();
    }

    // ── Steps actions ────────────────────────────────────────────────────────

    public void clickAddSteps() {
        stepsAddBtn.click();
    }

    public void clickEditSteps() {
        stepsEditBtn.click();
    }

    public void clickDeleteSteps() {
        stepsDeleteBtn.click();
    }

    public void enterSteps(String value) {
        stepsInput.clear();
        stepsInput.sendKeys(value);
    }

    public void saveSteps() {
        stepsSaveBtn.click();
    }

    public String getStepsValue() {
        return stepsValue.getText();
    }

    // ── Nutrition actions ────────────────────────────────────────────────────

    public void clickAddMeal() {
        addMealBtn.click();
    }

    // ── Workout actions ──────────────────────────────────────────────────────

    public void clickAddWorkout() {
        workoutAddBtn.click();
    }

    public void clickRenameWorkout() {
        workoutRenameBtn.click();
    }

    public void clickDeleteWorkout() {
        workoutDeleteBtn.click();
    }

    public String getSessionName() {
        return workoutSessionName.getText();
    }

    public int getExerciseCount() {
        return exerciseItems.size();
    }

    public void clickEditExercise(int index) {
        exerciseEditBtns.get(index).click();
    }

    public String getExerciseName(int index) {
        QAFWebElement item = exerciseItems.get(index);
        return item.findElement("css=.day-exercise-name").getText();
    }

    public String getExerciseDetail(int index) {
        QAFWebElement item = exerciseItems.get(index);
        return item.findElement("css=.day-exercise-reps").getText();
    }
}
