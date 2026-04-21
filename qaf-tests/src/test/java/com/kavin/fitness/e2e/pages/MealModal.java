package com.kavin.fitness.e2e.pages;

import com.qmetry.qaf.automation.ui.WebDriverBaseTestPage;
import com.qmetry.qaf.automation.ui.annotations.FindBy;
import com.qmetry.qaf.automation.ui.api.PageLocator;
import com.qmetry.qaf.automation.ui.api.WebDriverTestPage;
import com.qmetry.qaf.automation.ui.webdriver.QAFExtendedWebElement;

public class MealModal extends WebDriverBaseTestPage<WebDriverTestPage> {

    @FindBy(locator = "meal.modal.title")
    private QAFExtendedWebElement modalTitle;

    @FindBy(locator = "meal.modal.nameInput")
    private QAFExtendedWebElement nameInput;

    @FindBy(locator = "meal.modal.caloriesInput")
    private QAFExtendedWebElement caloriesInput;

    @FindBy(locator = "meal.modal.proteinInput")
    private QAFExtendedWebElement proteinInput;

    @FindBy(locator = "meal.modal.saveBtn")
    private QAFExtendedWebElement saveBtn;

    @FindBy(locator = "meal.modal.cancelBtn")
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

    public void enterMealName(String name) {
        nameInput.clear();
        nameInput.sendKeys(name);
    }

    public void enterCalories(String calories) {
        caloriesInput.clear();
        caloriesInput.sendKeys(calories);
    }

    public void enterProtein(String protein) {
        proteinInput.clear();
        proteinInput.sendKeys(protein);
    }

    public void save() {
        saveBtn.click();
    }

    public void cancel() {
        cancelBtn.click();
    }
}
