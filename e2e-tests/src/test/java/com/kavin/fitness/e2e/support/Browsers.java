package com.kavin.fitness.e2e.support;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Playwright;

import java.util.List;

/**
 * Launches a Playwright-managed Chromium browser. Replaces the Selenium
 * ChromeDriver factory. Playwright bundles its own Chromium build, so we
 * sidestep the host-Chrome / chromedriver version mismatch that was silently
 * dropping native clicks under headless Chrome 148.
 *
 * Pass -Dheaded=true to see the browser locally when debugging.
 */
public final class Browsers {
    private Browsers() {}

    public static Playwright newPlaywright() {
        return Playwright.create();
    }

    public static Browser chromium(Playwright playwright) {
        boolean headed = "true".equalsIgnoreCase(System.getProperty("headed"));
        return playwright.chromium().launch(
                new BrowserType.LaunchOptions()
                        .setHeadless(!headed)
                        .setArgs(List.of(
                                "--no-sandbox",
                                "--disable-dev-shm-usage"
                        ))
        );
    }
}
