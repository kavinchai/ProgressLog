package com.kavin.fitness.e2e.support;

import com.kavin.fitness.e2e.pages.LoginPage;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.Reporter;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public abstract class BaseTest {
    protected WebDriver driver;
    protected WebDriverWait wait;
    protected String baseUrl;

    @BeforeClass(alwaysRun = true)
    public void setUpDriverAndLogIn() {
        baseUrl = System.getProperty("env.baseurl", "http://localhost:5173");
        String apiUrl = System.getProperty("env.apiurl", "http://localhost:8080/api");
        String username = System.getProperty("test.user.username", "qaf-test");
        String password = System.getProperty("test.user.password", "qaf-test-password");

        ensureTestUserExists(apiUrl, username, password);

        driver = Drivers.chrome();
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        Reporter.log("Logging in as " + username, true);
        new LoginPage(driver).open(baseUrl).login(username, password);
        wait.until(d -> !d.getCurrentUrl().contains("/login"));
        waitForPageLoad();
    }

    private void ensureTestUserExists(String apiUrl, String username, String password) {
        try {
            String body = "{\"username\":\"" + username + "\","
                    + "\"password\":\"" + password + "\","
                    + "\"email\":\"" + username + "@test.local\"}";
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl + "/auth/register"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            Reporter.log("Test user setup: HTTP " + response.statusCode()
                    + (response.statusCode() == 201 ? " (created)" : " (already exists)"), true);
        } catch (Exception e) {
            Reporter.log("Could not pre-register test user, will attempt login anyway: " + e.getMessage(), true);
        }
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
        driver.get(baseUrl + "/");
        waitForPageLoad();
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
