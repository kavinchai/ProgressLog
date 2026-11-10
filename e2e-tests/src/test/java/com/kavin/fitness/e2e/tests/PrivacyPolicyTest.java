package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.LoginPage;
import com.kavin.fitness.e2e.support.BaseTest;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

/**
 * A signed-out visitor can reach the privacy policy from the sign-in screen. App Store review
 * requires the policy to be reachable inside the app without an account.
 */
public class PrivacyPolicyTest extends BaseTest {

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void signOut() {
        context.clearCookies();
        page.evaluate("() => localStorage.clear()");
    }

    @Test
    public void signInScreenLinksToPrivacyPolicy() {
        step("open the sign-in screen while signed out");
        LoginPage login = new LoginPage(page).open(baseUrl);

        step("follow the Privacy policy link");
        login.openPrivacyPolicy();

        step("verify the policy page is shown at /privacy");
        if (!page.url().endsWith("/privacy")) {
            throw new AssertionError("Expected URL to end with /privacy but was: " + page.url());
        }
        String title = page.locator("h1.privacy-title").innerText();
        if (!"Privacy Policy".equals(title)) {
            throw new AssertionError("Expected 'Privacy Policy' heading but got: " + title);
        }
    }
}
