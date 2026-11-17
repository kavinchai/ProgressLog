package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.LoginPage;
import com.kavin.fitness.e2e.pages.SettingsPage;
import com.kavin.fitness.e2e.support.BaseTest;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.Page;
import org.testng.annotations.Test;

/**
 * Sign in with Apple and Face ID unlock exist only in the iPhone app (they need the phone's
 * native sheets), so the website must not show them. Each check also looks for something that
 * is there, so a broken selector can't make it pass.
 */
public class IosOnlySignInTest extends BaseTest {

    @Test(priority = 1)
    public void signInPageHasNoAppleButtonOnTheWebsite() {
        try (BrowserContext fresh = browser.newContext()) {
            Page p = fresh.newPage();
            p.setDefaultTimeout(10_000);
            LoginPage login = new LoginPage(p);

            step("open the sign-in page");
            login.open(baseUrl);

            step("the username form is there, the Apple button isn't");
            if (!login.hasButton("login-btn")) {
                throw new AssertionError("Expected the Sign In button on the sign-in page");
            }
            if (login.hasButton("login-apple-btn") || login.hasAppleButtonText()) {
                throw new AssertionError("Did not expect Sign in with Apple on the website");
            }
        }
    }

    @Test(priority = 2)
    public void settingsHasNoAppleIdOrFaceIdOnTheWebsite() {
        SettingsPage settings = new SettingsPage(page);

        step("open Settings");
        settings.open(baseUrl);

        step("the Account rows are there, without Apple ID");
        if (!settings.hasRow("Password")) {
            throw new AssertionError("Expected the Password row in Settings");
        }
        if (settings.hasRow("Apple ID")) {
            throw new AssertionError("Did not expect the Apple ID row on the website");
        }

        step("after the page finishes loading, there's no Security group with Face ID unlock");
        settings.waitForEmailLoaded();
        if (!settings.hasGroup("Account")) {
            throw new AssertionError("Expected the Account group in Settings");
        }
        if (settings.hasGroup("Security")) {
            throw new AssertionError("Did not expect the Face ID Security group on the website");
        }
    }
}
