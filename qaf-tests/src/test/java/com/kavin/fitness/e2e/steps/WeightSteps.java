package com.kavin.fitness.e2e.steps;

import com.kavin.fitness.e2e.pages.TodayPage;
import com.kavin.fitness.e2e.pages.WeightModal;
import com.qmetry.qaf.automation.step.QAFTestStep;
import com.qmetry.qaf.automation.ui.WebDriverTestBase;
import org.openqa.selenium.By;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.Reporter;

import java.time.Duration;

public class WeightSteps {

    private final TodayPage todayPage = new TodayPage();
    private final WeightModal weightModal = new WeightModal();

    private static void step(String description) {
        System.out.println("  STEP: " + description);
        Reporter.log(description, false);
    }

    @QAFTestStep(description = "user clicks Add Weight button")
    public void userClicksAddWeight() {
        step("user clicks Add Weight button");
        todayPage.clickAddWeight();
    }

    @QAFTestStep(description = "user clicks Edit Weight button")
    public void userClicksEditWeight() {
        step("user clicks Edit Weight button");
        todayPage.clickEditWeight();
    }

    @QAFTestStep(description = "weight modal is displayed with title {title}")
    public void weightModalIsDisplayed(String title) {
        step("weight modal is displayed with title '" + title + "'");
        WebDriverWait wait = new WebDriverWait(
                new WebDriverTestBase().getDriver(), Duration.ofSeconds(5));
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector(".modal-title")));
        assert weightModal.getTitle().contains(title) :
                "Expected title '" + title + "' but got: " + weightModal.getTitle();
    }

    @QAFTestStep(description = "user enters weight value {weight}")
    public void userEntersWeightValue(String weight) {
        step("user enters weight value '" + weight + "'");
        weightModal.enterWeight(weight);
    }

    @QAFTestStep(description = "weight input has value {value}")
    public void weightInputHasValue(String value) {
        step("weight input has value '" + value + "'");
        assert weightModal.getWeightValue().equals(value) :
                "Expected weight value '" + value + "' but got: " + weightModal.getWeightValue();
    }

    @QAFTestStep(description = "user saves the weight")
    public void userSavesWeight() {
        step("user saves the weight");
        weightModal.save();
    }

    @QAFTestStep(description = "weight displays {value} on the page")
    public void weightDisplaysOnPage(String value) {
        step("weight displays '" + value + "' on the page");
        WebDriverWait wait = new WebDriverWait(
                new WebDriverTestBase().getDriver(), Duration.ofSeconds(5));
        wait.until(ExpectedConditions.textToBePresentInElementLocated(
                By.cssSelector(".day-detail-section:nth-child(1) .day-detail-value"),
                value));
    }
}
