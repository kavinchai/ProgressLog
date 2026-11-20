package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.ForgotPasswordPage;
import com.kavin.fitness.e2e.pages.LoginPage;
import com.kavin.fitness.e2e.support.BaseTest;
import com.kavin.fitness.e2e.support.TestApiClient;
import org.testng.Assert;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

/**
 * Forgot password from the sign-in screen: asking for a code moves on to the code step, and a
 * wrong code is turned away without changing the password. (The emailed code itself can't be read
 * here; the backend's PasswordResetFlowIT covers a successful reset.)
 *
 * Runs signed out, as a throwaway user registered here.
 */
public class ForgotPasswordTest extends BaseTest {
    private static final String PASSWORD = "forgot-me-123";

    private final String username = "qaf-forgot-" + System.currentTimeMillis();
    private final String apiUrl = System.getProperty("env.apiurl", "http://localhost:8080/api");
    private ForgotPasswordPage forgot;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void signOutWithThrowawayUser() {
        int status = new TestApiClient(apiUrl).post("/auth/register", "{\"username\":\"" + username + "\","
                + "\"password\":\"" + PASSWORD + "\","
                + "\"email\":\"" + username + "@test.local\"}").statusCode();
        if (status != 201) {
            throw new IllegalStateException("Could not register throwaway user: HTTP " + status);
        }
        context.clearCookies();
        page.evaluate("() => localStorage.clear()");
    }

    @Test(priority = 1)
    public void forgotPasswordLinkOpensTheResetPage() {
        step("follow Forgot password? from the sign-in screen");
        forgot = new LoginPage(page).open(baseUrl).openForgotPassword();

        step("go back to sign in");
        forgot.backToSignIn();
    }

    @Test(priority = 2)
    public void askingForACodeShowsTheCodeStep() {
        step("ask for a code with the username");
        forgot = new ForgotPasswordPage(page).open(baseUrl).requestCode(username);
        Assert.assertTrue(forgot.isOnCodeStep(), "Expected the 'Check your email' step");
    }

    @Test(priority = 3, dependsOnMethods = "askingForACodeShowsTheCodeStep")
    public void wrongCodeIsRejectedAndKeepsThePassword() {
        step("enter a code that wasn't sent");
        // The real code is random, so 000000 is wrong except about one run in a million.
        forgot.submitCode("000000", "brand-new-456");
        Assert.assertEquals(forgot.awaitError(), "That code is incorrect or has expired.");
        Assert.assertTrue(forgot.isOnCodeStep(), "Expected to stay on the code step");

        step("the old password still signs in");
        int status = new TestApiClient(apiUrl).post("/auth/login",
                "{\"username\":\"" + username + "\",\"password\":\"" + PASSWORD + "\"}").statusCode();
        Assert.assertEquals(status, 200, "Old password should still work after a wrong code");
    }
}
