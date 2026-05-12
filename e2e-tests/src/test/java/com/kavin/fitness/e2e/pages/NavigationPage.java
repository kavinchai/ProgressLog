package com.kavin.fitness.e2e.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.List;
import java.util.stream.Collectors;

public class NavigationPage {
    private final WebDriver driver;
    private final WebDriverWait wait;

    private static final By SIDEBAR_LINKS = By.cssSelector(".sidebar-nav .sidebar-link");
    private static final By SIDEBAR_ACTIVE_LINK = By.cssSelector(".sidebar-nav .sidebar-link.active");
    private static final By SIDEBAR_LOGO = By.cssSelector(".sidebar-logo");
    private static final By SIDEBAR_LOGOUT = By.cssSelector(".sidebar-logout");
    private static final By SIDEBAR_DARKMODE = By.cssSelector(".sidebar-darkmode");
    private static final By SIDEBAR_USER = By.cssSelector(".sidebar-user .muted");

    public NavigationPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public void waitForSidebar() {
        wait.until(ExpectedConditions.visibilityOfElementLocated(SIDEBAR_LOGO));
    }

    public List<String> getSidebarLinkLabels() {
        return driver.findElements(SIDEBAR_LINKS).stream()
                .map(WebElement::getText)
                .collect(Collectors.toList());
    }

    public String getActiveLinkLabel() {
        return driver.findElement(SIDEBAR_ACTIVE_LINK).getText();
    }

    public void clickSidebarLink(String label) {
        driver.findElement(By.xpath(
                "//nav[contains(@class,'sidebar-nav')]//a[text()='" + label + "']")).click();
    }

    public void waitForUrlContains(String path) {
        wait.until(ExpectedConditions.urlContains(path));
    }

    public String getDisplayedUsername() {
        return driver.findElement(SIDEBAR_USER).getText();
    }

    public String getDarkModeButtonText() {
        return driver.findElement(SIDEBAR_DARKMODE).getText();
    }

    public void clickDarkModeToggle() {
        driver.findElement(SIDEBAR_DARKMODE).click();
    }

    public void clickLogout() {
        driver.findElement(SIDEBAR_LOGOUT).click();
    }
}
