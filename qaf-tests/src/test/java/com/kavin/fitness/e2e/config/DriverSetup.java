package com.kavin.fitness.e2e.config;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.testng.annotations.BeforeSuite;

/**
 * Ensures ChromeDriver binary is available before test suite runs.
 * WebDriverManager downloads and caches the appropriate driver version.
 */
public class DriverSetup {

    @BeforeSuite(alwaysRun = true)
    public void setupDriver() {
        WebDriverManager.chromedriver().setup();
    }
}
