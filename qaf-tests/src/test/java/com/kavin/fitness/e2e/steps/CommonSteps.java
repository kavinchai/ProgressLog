package com.kavin.fitness.e2e.steps;

import com.kavin.fitness.e2e.pages.LoginPage;
import com.kavin.fitness.e2e.pages.TodayPage;
import com.qmetry.qaf.automation.core.ConfigurationManager;
import com.qmetry.qaf.automation.step.QAFTestStep;
import com.qmetry.qaf.automation.ui.WebDriverTestBase;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public class CommonSteps {

    @QAFTestStep(description = "user is logged in with email {email} and password {password}")
    public void userIsLoggedIn(String email, String password) {
        LoginPage loginPage = new LoginPage();
        loginPage.launchPage(null);
        loginPage.login(email, password);

        // Wait for redirect to Today page
        WebDriverWait wait = new WebDriverWait(
                new WebDriverTestBase().getDriver(),
                Duration.ofSeconds(10)
        );
        wait.until(ExpectedConditions.urlContains("/"));
    }

    @QAFTestStep(description = "user navigates to the Today page")
    public void userNavigatesToTodayPage() {
        String baseUrl = ConfigurationManager.getBundle().getString("env.baseurl");
        new WebDriverTestBase().getDriver().get(baseUrl + "/");
    }

    @QAFTestStep(description = "user waits for page to load")
    public void userWaitsForPageToLoad() {
        WebDriverWait wait = new WebDriverWait(
                new WebDriverTestBase().getDriver(),
                Duration.ofSeconds(10)
        );
        wait.until(d -> {
            String readyState = (String) ((org.openqa.selenium.JavascriptExecutor) d)
                    .executeScript("return document.readyState");
            return "complete".equals(readyState);
        });
    }

    @QAFTestStep(description = "modal with title {title} is displayed")
    public void modalWithTitleIsDisplayed(String title) {
        WebDriverWait wait = new WebDriverWait(
                new WebDriverTestBase().getDriver(),
                Duration.ofSeconds(5)
        );
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                org.openqa.selenium.By.cssSelector(".modal-title")
        ));
        String actual = new WebDriverTestBase().getDriver()
                .findElement(org.openqa.selenium.By.cssSelector(".modal-title"))
                .getText();
        assert actual.contains(title) : "Expected modal title to contain '" + title + "' but got '" + actual + "'";
    }

    @QAFTestStep(description = "modal is closed")
    public void modalIsClosed() {
        WebDriverWait wait = new WebDriverWait(
                new WebDriverTestBase().getDriver(),
                Duration.ofSeconds(5)
        );
        wait.until(ExpectedConditions.invisibilityOfElementLocated(
                org.openqa.selenium.By.cssSelector(".modal-title")
        ));
    }

    @QAFTestStep(description = "element with text {text} is visible")
    public void elementWithTextIsVisible(String text) {
        WebDriverWait wait = new WebDriverWait(
                new WebDriverTestBase().getDriver(),
                Duration.ofSeconds(5)
        );
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                org.openqa.selenium.By.xpath("//*[contains(text(),'" + text + "')]")
        ));
    }

    @QAFTestStep(description = "element with text {text} is not visible")
    public void elementWithTextIsNotVisible(String text) {
        WebDriverWait wait = new WebDriverWait(
                new WebDriverTestBase().getDriver(),
                Duration.ofSeconds(5)
        );
        wait.until(ExpectedConditions.invisibilityOfElementLocated(
                org.openqa.selenium.By.xpath("//*[contains(text(),'" + text + "')]")
        ));
    }
}
