package com.kavin.fitness.e2e.pages;

import com.qmetry.qaf.automation.core.ConfigurationManager;
import com.qmetry.qaf.automation.ui.WebDriverBaseTestPage;
import com.qmetry.qaf.automation.ui.annotations.FindBy;
import com.qmetry.qaf.automation.ui.api.PageLocator;
import com.qmetry.qaf.automation.ui.api.WebDriverTestPage;
import com.qmetry.qaf.automation.ui.webdriver.QAFExtendedWebElement;

public class LoginPage extends WebDriverBaseTestPage<WebDriverTestPage> {

    @FindBy(locator = "login.emailInput")
    private QAFExtendedWebElement emailInput;

    @FindBy(locator = "login.passwordInput")
    private QAFExtendedWebElement passwordInput;

    @FindBy(locator = "login.submitBtn")
    private QAFExtendedWebElement submitBtn;

    @FindBy(locator = "login.errorMessage")
    private QAFExtendedWebElement errorMessage;

    @Override
    protected void openPage(PageLocator locator, Object... args) {
        driver.get(getBaseUrl() + "/login");
    }

    private String getBaseUrl() {
        return ConfigurationManager.getBundle().getString("env.baseurl", "http://localhost:5173");
    }

    public void login(String email, String password) {
        emailInput.clear();
        emailInput.sendKeys(email);
        passwordInput.clear();
        passwordInput.sendKeys(password);
        submitBtn.click();
    }

    public boolean isErrorDisplayed() {
        return errorMessage.isDisplayed();
    }

    public String getErrorMessage() {
        return errorMessage.getText();
    }
}
