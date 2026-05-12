package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.support.Drivers;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.Reporter;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import java.time.Duration;
import java.util.List;

/**
 * Tests for the Login page UI elements and error handling.
 * Uses a separate driver (not logged in) to test unauthenticated flows.
 */
public class LoginPageTest {
    private WebDriver driver;
    private WebDriverWait wait;
    private String baseUrl;

    @BeforeClass(alwaysRun = true)
    public void setUp() {
        baseUrl = System.getProperty("env.baseurl", "http://localhost:5173");
        driver = Drivers.chrome();
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    @AfterClass(alwaysRun = true)
    public void tearDown() {
        if (driver != null) driver.quit();
    }

    private void step(String msg) {
        System.out.println("  STEP: " + msg);
        Reporter.log(msg, false);
    }

    @Test(priority = 1)
    public void loginPageDisplaysFormElements() {
        step("navigate to /login");
        driver.get(baseUrl + "/login");
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("#username")));

        step("verify username input, password input, and submit button exist");
        assertElementExists("#username", "username input");
        assertElementExists("#password", "password input");
        assertElementExists("button.login-btn[type='submit']", "submit button");
    }

    @Test(priority = 2)
    public void loginPageShowsTitle() {
        step("navigate to /login");
        driver.get(baseUrl + "/login");
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector(".login-title")));

        step("verify title text");
        String title = driver.findElement(By.cssSelector(".login-title")).getText();
        if (!"ProgressLog".equals(title)) {
            throw new AssertionError("Expected title 'ProgressLog' but got: " + title);
        }
    }

    @Test(priority = 3)
    public void loginPageShowsSignUpToggle() {
        step("navigate to /login");
        driver.get(baseUrl + "/login");
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector(".login-switch-btn")));

        step("verify sign up toggle text");
        String switchText = driver.findElement(By.cssSelector(".login-switch-btn")).getText();
        if (!switchText.contains("Sign up")) {
            throw new AssertionError("Expected switch button to contain 'Sign up' but got: " + switchText);
        }
    }

    @Test(priority = 4)
    public void switchToSignUpShowsEmailField() {
        step("navigate to /login");
        driver.get(baseUrl + "/login");
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector(".login-switch-btn")));

        step("verify email field is NOT visible in login mode");
        List<WebElement> emailFields = driver.findElements(By.cssSelector("#email"));
        if (!emailFields.isEmpty() && emailFields.get(0).isDisplayed()) {
            throw new AssertionError("Email field should not be visible in login mode");
        }

        step("click switch to sign up");
        driver.findElement(By.cssSelector(".login-switch-btn")).click();

        step("verify email field IS visible in sign up mode");
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("#email")));
    }

    @Test(priority = 5)
    public void invalidLoginShowsError() {
        step("navigate to /login");
        driver.get(baseUrl + "/login");
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("#username")));

        step("enter invalid credentials and submit");
        driver.findElement(By.cssSelector("#username")).sendKeys("nonexistent_user_xyz");
        driver.findElement(By.cssSelector("#password")).sendKeys("wrong_password_123");
        driver.findElement(By.cssSelector("button.login-btn[type='submit']")).click();

        step("verify error message is displayed");
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector(".login-error")));
        String error = driver.findElement(By.cssSelector(".login-error")).getText();
        if (error == null || error.trim().isEmpty()) {
            throw new AssertionError("Expected an error message but got empty text");
        }
    }

    @Test(priority = 6)
    public void unauthenticatedUserRedirectsToSplashOrLogin() {
        step("navigate to /today without login");
        driver.get(baseUrl + "/today");
        wait.until(d -> {
            String url = d.getCurrentUrl();
            return url.endsWith("/") || url.contains("/login") || url.contains("/today");
        });

        step("verify not on a protected page (redirected to splash or login)");
        String url = driver.getCurrentUrl();
        if (url.contains("/today")) {
            List<WebElement> sidebar = driver.findElements(By.cssSelector(".sidebar"));
            if (!sidebar.isEmpty() && sidebar.get(0).isDisplayed()) {
                throw new AssertionError("Should not be able to access /today without login");
            }
        }
    }

    private void assertElementExists(String cssSelector, String description) {
        List<WebElement> els = driver.findElements(By.cssSelector(cssSelector));
        if (els.isEmpty()) {
            throw new AssertionError("Expected " + description + " (" + cssSelector + ") to exist");
        }
    }
}
