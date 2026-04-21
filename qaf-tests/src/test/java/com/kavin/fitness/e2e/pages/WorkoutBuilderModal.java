package com.kavin.fitness.e2e.pages;

import com.qmetry.qaf.automation.ui.WebDriverBaseTestPage;
import com.qmetry.qaf.automation.ui.annotations.FindBy;
import com.qmetry.qaf.automation.ui.api.PageLocator;
import com.qmetry.qaf.automation.ui.api.WebDriverTestPage;
import com.qmetry.qaf.automation.ui.webdriver.QAFExtendedWebElement;
import com.qmetry.qaf.automation.ui.webdriver.QAFWebElement;

import java.util.List;

public class WorkoutBuilderModal extends WebDriverBaseTestPage<WebDriverTestPage> {

    @FindBy(locator = "workout.modal.title")
    private QAFExtendedWebElement modalTitle;

    @FindBy(locator = "workout.modal.sessionNameInput")
    private QAFExtendedWebElement sessionNameInput;

    @FindBy(locator = "workout.modal.addExerciseBtn")
    private QAFExtendedWebElement addExerciseBtn;

    @FindBy(locator = "workout.modal.addRunBtn")
    private QAFExtendedWebElement addRunBtn;

    @FindBy(locator = "workout.modal.addTimedBtn")
    private QAFExtendedWebElement addTimedBtn;

    @FindBy(locator = "workout.modal.saveBtn")
    private QAFExtendedWebElement saveBtn;

    @FindBy(locator = "workout.modal.cancelBtn")
    private QAFExtendedWebElement cancelBtn;

    @FindBy(locator = "workout.modal.exerciseNameInputs")
    private List<QAFWebElement> exerciseNameInputs;

    @FindBy(locator = "workout.modal.weightInputs")
    private List<QAFWebElement> weightInputs;

    @FindBy(locator = "workout.modal.repsInputs")
    private List<QAFWebElement> repsInputs;

    @FindBy(locator = "workout.modal.distanceInputs")
    private List<QAFWebElement> distanceInputs;

    @FindBy(locator = "workout.modal.hoursInputs")
    private List<QAFWebElement> hoursInputs;

    @FindBy(locator = "workout.modal.minutesInputs")
    private List<QAFWebElement> minutesInputs;

    @FindBy(locator = "workout.modal.secondsInputs")
    private List<QAFWebElement> secondsInputs;

    @FindBy(locator = "workout.modal.addSetBtns")
    private List<QAFWebElement> addSetBtns;

    @FindBy(locator = "workout.modal.typeBtns")
    private List<QAFWebElement> typeBtns;

    @Override
    protected void openPage(PageLocator locator, Object... args) {
        // Modal is opened from TodayPage actions
    }

    public boolean isDisplayed() {
        return modalTitle.isDisplayed();
    }

    public String getTitle() {
        return modalTitle.getText();
    }

    // ── Session ──────────────────────────────────────────────────────────────

    public void enterSessionName(String name) {
        sessionNameInput.clear();
        sessionNameInput.sendKeys(name);
    }

    // ── Exercise actions ─────────────────────────────────────────────────────

    public void clickAddExercise() {
        addExerciseBtn.click();
    }

    public void clickAddRun() {
        addRunBtn.click();
    }

    public void clickAddTimed() {
        addTimedBtn.click();
    }

    public void enterExerciseName(int index, String name) {
        QAFWebElement input = exerciseNameInputs.get(index);
        input.clear();
        input.sendKeys(name);
    }

    public void enterWeight(int index, String weight) {
        QAFWebElement input = weightInputs.get(index);
        input.clear();
        input.sendKeys(weight);
    }

    public void enterReps(int index, String reps) {
        QAFWebElement input = repsInputs.get(index);
        input.clear();
        input.sendKeys(reps);
    }

    public void enterDistance(int index, String distance) {
        QAFWebElement input = distanceInputs.get(index);
        input.clear();
        input.sendKeys(distance);
    }

    public void enterHours(int index, String hours) {
        QAFWebElement input = hoursInputs.get(index);
        input.clear();
        input.sendKeys(hours);
    }

    public void enterMinutes(int index, String minutes) {
        QAFWebElement input = minutesInputs.get(index);
        input.clear();
        input.sendKeys(minutes);
    }

    public void enterSeconds(int index, String seconds) {
        QAFWebElement input = secondsInputs.get(index);
        input.clear();
        input.sendKeys(seconds);
    }

    public void clickAddSet(int exerciseIndex) {
        addSetBtns.get(exerciseIndex).click();
    }

    public void toggleExerciseType(int exerciseIndex) {
        typeBtns.get(exerciseIndex).click();
    }

    // ── Save / Cancel ────────────────────────────────────────────────────────

    public void save() {
        saveBtn.click();
    }

    public void cancel() {
        cancelBtn.click();
    }
}
