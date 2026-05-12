package com.kavin.fitness.e2e.support;

import com.kavin.fitness.e2e.pages.LoginPage;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.Reporter;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;

import java.time.Duration;

public abstract class BaseTest {
    protected WebDriver driver;
    protected WebDriverWait wait;
    protected String baseUrl;

    @BeforeClass(alwaysRun = true)
    public void setUpDriverAndLogIn() {
        baseUrl = System.getProperty("env.baseurl", "http://localhost:5173");
        String username = System.getProperty("test.user.username", "qaf_test_user");
        String password = System.getProperty("test.user.password", "qaf_test_password");

        driver = Drivers.chrome();
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        Reporter.log("Logging in as " + username, true);
        new LoginPage(driver).open(baseUrl).login(username, password);
        wait.until(d -> !d.getCurrentUrl().contains("/login"));
        waitForPageLoad();
    }

    @AfterClass(alwaysRun = true)
    public void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }

    protected void waitForPageLoad() {
        wait.until(d -> "complete".equals(
                ((JavascriptExecutor) d).executeScript("return document.readyState")));
    }

    protected void navigateToToday() {
        driver.get(baseUrl + "/today");
        waitForPageLoad();
        wait.until(org.openqa.selenium.support.ui.ExpectedConditions.presenceOfElementLocated(
                org.openqa.selenium.By.cssSelector(".section-box")));
    }

    protected void step(String description) {
        System.out.println("  STEP: " + description);
        Reporter.log(description, false);
    }

    protected void waitForModalClosed() {
        wait.until(ExpectedConditions.invisibilityOfElementLocated(
                org.openqa.selenium.By.cssSelector(".modal-title")));
    }
}
