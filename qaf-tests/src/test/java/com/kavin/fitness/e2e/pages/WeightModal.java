package com.kavin.fitness.e2e.pages;

import com.qmetry.qaf.automation.ui.WebDriverBaseTestPage;
import com.qmetry.qaf.automation.ui.annotations.FindBy;
import com.qmetry.qaf.automation.ui.api.PageLocator;
import com.qmetry.qaf.automation.ui.api.WebDriverTestPage;
import com.qmetry.qaf.automation.ui.webdriver.QAFExtendedWebElement;

public class WeightModal extends WebDriverBaseTestPage<WebDriverTestPage> {

    @FindBy(locator = "weight.modal.title")
    private QAFExtendedWebElement modalTitle;

    @FindBy(locator = "weight.modal.weightInput")
    private QAFExtendedWebElement weightInput;

    @FindBy(locator = "weight.modal.saveBtn")
    private QAFExtendedWebElement saveBtn;

    @FindBy(locator = "weight.modal.cancelBtn")
    private QAFExtendedWebElement cancelBtn;

    @Override
    protected void openPage(PageLocator locator, Object... args) {
        // Opened from TodayPage
    }

    public boolean isDisplayed() {
        return modalTitle.isDisplayed();
    }

    public String getTitle() {
        return modalTitle.getText();
    }

    public void enterWeight(String weight) {
        weightInput.clear();
        weightInput.sendKeys(weight);
    }

    public String getWeightValue() {
        return weightInput.getAttribute("value");
    }

    public void save() {
        saveBtn.click();
    }

    public void cancel() {
        cancelBtn.click();
    }
}
