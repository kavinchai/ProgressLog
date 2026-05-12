package com.kavin.fitness.e2e.steps;

import com.kavin.fitness.e2e.pages.LoginPage;
import com.qmetry.qaf.automation.core.ConfigurationManager;
import com.qmetry.qaf.automation.step.QAFTestStep;
import com.qmetry.qaf.automation.ui.WebDriverTestBase;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.Reporter;

import java.time.Duration;

public class CommonSteps {

    private static void step(String description) {
        System.out.println("  STEP: " + description);
        Reporter.log(description, false);
    }

    @QAFTestStep(description = "user is logged in with username {username} and password {password}")
    public void userIsLoggedIn(String username, String password) {
        step("user is logged in with username '" + username + "'");
        LoginPage loginPage = new LoginPage();
        loginPage.launchPage(null);
        loginPage.login(username, password);

        WebDriverWait wait = new WebDriverWait(
                new WebDriverTestBase().getDriver(),
                Duration.ofSeconds(10)
        );
        wait.until(d -> !d.getCurrentUrl().contains("/login"));
    }

    @QAFTestStep(description = "user navigates to the Today page")
    public void userNavigatesToTodayPage() {
        step("user navigates to the Today page");
        String baseUrl = ConfigurationManager.getBundle().getString("env.baseurl");
        new WebDriverTestBase().getDriver().get(baseUrl + "/");
    }

    @QAFTestStep(description = "user waits for page to load")
    public void userWaitsForPageToLoad() {
        step("user waits for page to load");
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
        step("modal with title '" + title + "' is displayed");
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
        step("modal is closed");
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
        step("element with text '" + text + "' is visible");
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
        step("element with text '" + text + "' is not visible");
        WebDriverWait wait = new WebDriverWait(
                new WebDriverTestBase().getDriver(),
                Duration.ofSeconds(5)
        );
        wait.until(ExpectedConditions.invisibilityOfElementLocated(
                org.openqa.selenium.By.xpath("//*[contains(text(),'" + text + "')]")
        ));
    }
}
