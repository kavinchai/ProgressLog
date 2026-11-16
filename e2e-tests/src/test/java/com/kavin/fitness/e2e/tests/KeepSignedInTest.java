package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.LoginPage;
import com.kavin.fitness.e2e.support.BaseTest;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.Cookie;
import org.testng.annotations.Test;

/**
 * "Keep me signed in" on the sign-in page decides how long the sign-in cookie lasts:
 * 30 days when ticked, 1 day when not. Each test signs in from a fresh browser context.
 */
public class KeepSignedInTest extends BaseTest {
    private static final double DAY_SECONDS = 24 * 60 * 60;

    @Test(priority = 1)
    public void tickedBoxKeepsYouSignedInForThirtyDays() {
        double days = signInAndGetCookieDays(true);
        if (days < 29.9 || days > 30.1) {
            throw new AssertionError("Expected the sign-in cookie to last ~30 days but it lasts " + days);
        }
    }

    @Test(priority = 2)
    public void untickedBoxSignsYouOutAfterADay() {
        double days = signInAndGetCookieDays(false);
        if (days < 0.9 || days > 1.1) {
            throw new AssertionError("Expected the sign-in cookie to last ~1 day but it lasts " + days);
        }
    }

    private double signInAndGetCookieDays(boolean keep) {
        String username = System.getProperty("test.user.username", "qaf-test");
        String password = System.getProperty("test.user.password", "qaf-test-password");

        try (BrowserContext fresh = browser.newContext()) {
            Page p = fresh.newPage();
            p.setDefaultTimeout(10_000);

            step("sign in with Keep me signed in " + (keep ? "ticked" : "unticked"));
            new LoginPage(p).open(baseUrl).setKeepSignedIn(keep).login(username, password);
            p.waitForURL(url -> !url.contains("/login"));

            step("read the jwt cookie's expiry");
            Cookie jwt = fresh.cookies().stream()
                    .filter(c -> "jwt".equals(c.name))
                    .findFirst()
                    .orElseThrow(() -> new AssertionError("Expected a 'jwt' cookie after signing in"));
            return (jwt.expires - System.currentTimeMillis() / 1000.0) / DAY_SECONDS;
        }
    }
}
