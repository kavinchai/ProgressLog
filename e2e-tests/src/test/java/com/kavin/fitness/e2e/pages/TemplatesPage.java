package com.kavin.fitness.e2e.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.StaleElementReferenceException;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.List;

public class TemplatesPage {
    private final WebDriver driver;
    private final WebDriverWait wait;

    private static final By PAGE_TITLE = By.cssSelector(".templates-title");
    private static final By NEW_BTN = By.xpath(
            "//button[contains(@class,'btn-primary') and text()='+ New']");
    private static final By TEMPLATE_CARDS = By.cssSelector(".template-card");
    private static final By TEMPLATE_NAMES = By.cssSelector(".template-card-name");
    private static final By EMPTY_MESSAGE = By.cssSelector(".templates-empty");

    private static final By MODAL_TITLE = By.cssSelector(".modal-title");
    private static final By TEMPLATE_NAME_INPUT = By.cssSelector(
            ".modal-box input[placeholder*='Push Day' i]");
    private static final By MODAL_SAVE = By.xpath(
            "//div[contains(@class,'modal')]//button[contains(@class,'btn-primary') " +
                    "and (text()='Save' or contains(text(),'Saving'))]");
    private static final By MODAL_CANCEL = By.xpath(
            "//div[contains(@class,'modal')]//button[contains(@class,'btn-ghost')]");

    public TemplatesPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public void open(String baseUrl) {
        driver.get(baseUrl + "/templates");
        wait.until(ExpectedConditions.visibilityOfElementLocated(PAGE_TITLE));
    }

    public String getPageTitle() {
        return driver.findElement(PAGE_TITLE).getText();
    }

    public void clickNewTemplate() {
        driver.findElement(NEW_BTN).click();
    }

    public void waitForModalVisible(String expectedTitle) {
        wait.until(ExpectedConditions.visibilityOfElementLocated(MODAL_TITLE));
        String actual = driver.findElement(MODAL_TITLE).getText();
        if (!actual.contains(expectedTitle)) {
            throw new AssertionError("Expected modal title '" + expectedTitle + "' but got: " + actual);
        }
    }

    public void enterTemplateName(String name) {
        WebElement el = driver.findElement(TEMPLATE_NAME_INPUT);
        el.clear();
        el.sendKeys(name);
    }

    public void clickModalSave() {
        driver.findElement(MODAL_SAVE).click();
    }

    public void clickModalCancel() {
        driver.findElement(MODAL_CANCEL).click();
    }

    public int getTemplateCount() {
        return driver.findElements(TEMPLATE_CARDS).size();
    }

    public boolean isTemplateVisible(String name) {
        return driver.findElements(TEMPLATE_NAMES).stream()
                .anyMatch(el -> el.getText().contains(name));
    }

    public void waitForTemplateVisible(String name) {
        wait.until(d -> d.findElements(TEMPLATE_NAMES).stream()
                .anyMatch(el -> el.getText().contains(name)));
    }

    public void clickDeleteTemplate(String name) {
        List<WebElement> cards = driver.findElements(TEMPLATE_CARDS);
        for (WebElement card : cards) {
            if (card.getText().contains(name)) {
                card.findElement(By.cssSelector(".btn-danger")).click();
                return;
            }
        }
        throw new AssertionError("Template '" + name + "' not found");
    }

    public void clickEditTemplate(String name) {
        List<WebElement> cards = driver.findElements(TEMPLATE_CARDS);
        for (WebElement card : cards) {
            if (card.getText().contains(name)) {
                List<WebElement> btns = card.findElements(By.cssSelector(".btn.btn-sm"));
                for (WebElement btn : btns) {
                    if ("Edit".equals(btn.getText())) {
                        btn.click();
                        return;
                    }
                }
            }
        }
        throw new AssertionError("Template '" + name + "' not found");
    }

    public void clickUseTemplate(String name) {
        List<WebElement> cards = driver.findElements(TEMPLATE_CARDS);
        for (WebElement card : cards) {
            if (card.getText().contains(name)) {
                card.findElement(By.cssSelector(".btn-primary")).click();
                return;
            }
        }
        throw new AssertionError("Template '" + name + "' not found");
    }

    public void waitForTemplateRemoved(String name) {
        wait.until(d -> {
            try {
                return d.findElements(TEMPLATE_NAMES).stream()
                        .noneMatch(el -> el.getText().contains(name));
            } catch (StaleElementReferenceException e) {
                return false;
            }
        });
    }

    public boolean isEmptyMessageVisible() {
        List<WebElement> els = driver.findElements(EMPTY_MESSAGE);
        return !els.isEmpty() && els.get(0).isDisplayed();
    }
}
