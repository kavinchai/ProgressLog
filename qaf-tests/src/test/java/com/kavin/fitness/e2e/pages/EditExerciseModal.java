package com.kavin.fitness.e2e.pages;

import com.qmetry.qaf.automation.ui.WebDriverBaseTestPage;
import com.qmetry.qaf.automation.ui.annotations.FindBy;
import com.qmetry.qaf.automation.ui.api.PageLocator;
import com.qmetry.qaf.automation.ui.api.WebDriverTestPage;
import com.qmetry.qaf.automation.ui.webdriver.QAFExtendedWebElement;
import com.qmetry.qaf.automation.ui.webdriver.QAFWebElement;

import java.util.List;

public class EditExerciseModal extends WebDriverBaseTestPage<WebDriverTestPage> {

    @FindBy(locator = "editExercise.modal.title")
    private QAFExtendedWebElement modalTitle;

    @FindBy(locator = "editExercise.modal.weightInputs")
    private List<QAFWebElement> weightInputs;

    @FindBy(locator = "editExercise.modal.repsInputs")
    private List<QAFWebElement> repsInputs;

    @FindBy(locator = "editExercise.modal.distanceInputs")
    private List<QAFWebElement> distanceInputs;

    @FindBy(locator = "editExercise.modal.hoursInputs")
    private List<QAFWebElement> hoursInputs;

    @FindBy(locator = "editExercise.modal.minutesInputs")
    private List<QAFWebElement> minutesInputs;

    @FindBy(locator = "editExercise.modal.secondsInputs")
    private List<QAFWebElement> secondsInputs;

    @FindBy(locator = "editExercise.modal.saveBtn")
    private QAFExtendedWebElement saveBtn;

    @FindBy(locator = "editExercise.modal.deleteBtn")
    private QAFExtendedWebElement deleteBtn;

    @FindBy(locator = "editExercise.modal.cancelBtn")
    private QAFExtendedWebElement cancelBtn;

    @Override
    protected void openPage(PageLocator locator, Object... args) {
        // Opened from TodayPage exercise edit button
    }

    public boolean isDisplayed() {
        return modalTitle.isDisplayed();
    }

    public String getTitle() {
        return modalTitle.getText();
    }

    // ── Lifting fields ───────────────────────────────────────────────────────

    public void enterWeight(int setIndex, String weight) {
        QAFWebElement input = weightInputs.get(setIndex);
        input.clear();
        input.sendKeys(weight);
    }

    public String getWeight(int setIndex) {
        return weightInputs.get(setIndex).getAttribute("value");
    }

    public void enterReps(int setIndex, String reps) {
        QAFWebElement input = repsInputs.get(setIndex);
        input.clear();
        input.sendKeys(reps);
    }

    // ── Run fields ───────────────────────────────────────────────────────────

    public void enterDistance(int setIndex, String distance) {
        QAFWebElement input = distanceInputs.get(setIndex);
        input.clear();
        input.sendKeys(distance);
    }

    public String getDistance(int setIndex) {
        return distanceInputs.get(setIndex).getAttribute("value");
    }

    // ── Timed fields ─────────────────────────────────────────────────────────

    public void enterHours(int setIndex, String hours) {
        QAFWebElement input = hoursInputs.get(setIndex);
        input.clear();
        input.sendKeys(hours);
    }

    public void enterMinutes(int setIndex, String minutes) {
        QAFWebElement input = minutesInputs.get(setIndex);
        input.clear();
        input.sendKeys(minutes);
    }

    public void enterSeconds(int setIndex, String seconds) {
        QAFWebElement input = secondsInputs.get(setIndex);
        input.clear();
        input.sendKeys(seconds);
    }

    public String getMinutes(int setIndex) {
        return minutesInputs.get(setIndex).getAttribute("value");
    }

    public String getSeconds(int setIndex) {
        return secondsInputs.get(setIndex).getAttribute("value");
    }

    // ── Actions ──────────────────────────────────────────────────────────────

    public void save() {
        saveBtn.click();
    }

    public void deleteExercise() {
        deleteBtn.click();
    }

    public void cancel() {
        cancelBtn.click();
    }
}
