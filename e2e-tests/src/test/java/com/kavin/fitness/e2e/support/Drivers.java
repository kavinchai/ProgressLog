package com.kavin.fitness.e2e.support;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.logging.LogType;
import org.openqa.selenium.logging.LoggingPreferences;

import java.util.logging.Level;

public final class Drivers {
    private Drivers() {}

    public static WebDriver chrome() {
        WebDriverManager.chromedriver().setup();
        ChromeOptions options = new ChromeOptions();
        // Headless by default (CI). Pass -Dheadless=false to see the browser
        // when debugging locally.
        boolean headless = !"false".equalsIgnoreCase(System.getProperty("headless"));
        if (headless) {
            options.addArguments("--headless=new");
        }
        options.addArguments(
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--window-size=1920,1080"
        );

        // Capture browser console output so FailureDiagnostics can include
        // runtime errors in the per-test failure dump. Without this the
        // BROWSER log channel returns empty.
        LoggingPreferences logPrefs = new LoggingPreferences();
        logPrefs.enable(LogType.BROWSER, Level.ALL);
        options.setCapability("goog:loggingPrefs", logPrefs);

        return new ChromeDriver(options);
    }
}
