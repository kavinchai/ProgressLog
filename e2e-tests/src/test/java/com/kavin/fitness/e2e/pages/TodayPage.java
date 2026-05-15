package com.kavin.fitness.e2e.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.List;

public class TodayPage {
    private final WebDriver driver;
    private final WebDriverWait wait;

    private static final int WEIGHT_IDX = 1;
    private static final int STEPS_IDX = 2;
    private static final int WORKOUT_IDX = 3;
    private static final int NUTRITION_IDX = 4;

    public TodayPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    /** nth-child offset: today-page-header is 1st child, section-boxes start at 2nd */
    private int cssNth(int sectionIdx) { return sectionIdx + 1; }

    private WebElement sectionBtnContains(int sectionIdx, String text) {
        return driver.findElement(By.xpath(
                "(//div[contains(@class,'section-box')])[" + sectionIdx +
                        "]//button[contains(text(),'" + text + "')]"));
    }

    private WebElement sectionBtnExact(int sectionIdx, String text) {
        return driver.findElement(By.xpath(
                "(//div[contains(@class,'section-box')])[" + sectionIdx +
                        "]//button[text()='" + text + "']"));
    }

    // ── Weight ───────────────────────────────────────────────────────────────

    public void clickAddWeight() { sectionBtnContains(WEIGHT_IDX, "+ Add").click(); }
    public void clickEditWeight() { sectionBtnExact(WEIGHT_IDX, "Edit").click(); }

    public void waitForWeightValue(String expected) {
        wait.until(ExpectedConditions.textToBePresentInElementLocated(
                By.cssSelector(".section-box:nth-child(" + cssNth(WEIGHT_IDX) + ") .today-data-value"),
                expected));
    }

    // ── Steps ────────────────────────────────────────────────────────────────

    public void clickAddSteps() {
        List<WebElement> addBtns = driver.findElements(By.xpath(
                "(//div[contains(@class,'section-box')])[" + STEPS_IDX +
                        "]//button[contains(text(),'+ Add')]"));
        if (!addBtns.isEmpty()) {
            addBtns.get(0).click();
        } else {
            sectionBtnExact(STEPS_IDX, "Edit").click();
        }
    }

    public void clickDeleteSteps() {
        driver.findElement(By.xpath(
                "(//div[contains(@class,'section-box')])[" + STEPS_IDX +
                        "]//button[contains(@class,'btn-danger')]")).click();
    }

    public void enterSteps(String value) {
        WebElement input = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector(".today-steps-edit input[type='number']")));
        input.clear();
        input.sendKeys(value);
    }

    public void saveSteps() {
        driver.findElement(By.cssSelector(".today-steps-edit .btn-primary")).click();
    }

    public void waitForStepsValue(String expected) {
        if ("--".equals(expected)) {
            wait.until(ExpectedConditions.textToBePresentInElementLocated(
                    By.cssSelector(".section-box:nth-child(" + cssNth(STEPS_IDX) + ") .section-body"),
                    "No steps logged"));
        } else {
            wait.until(ExpectedConditions.textToBePresentInElementLocated(
                    By.cssSelector(".section-box:nth-child(" + cssNth(STEPS_IDX) + ") .today-data-value"),
                    expected));
        }
    }

    // ── Nutrition / Meals ────────────────────────────────────────────────────

    public void clickAddMeal() {
        driver.findElement(By.xpath(
                "//button[contains(text(),'+ Add Meal') or contains(text(),'+ Meal')]")).click();
    }

    public void waitForMealDisplayed(String name) {
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.xpath("//span[contains(@class,'meal-card-name') and contains(text(),'" + name + "')]")));
    }

    /** Count of meal cards currently displayed. */
    public int getMealCount() {
        return driver.findElements(By.cssSelector(".meal-card-name")).size();
    }

    /**
     * True iff at least one meal card has the default "Meal N" name that the
     * UI assigns when a meal is saved without an explicit name.
     */
    public boolean hasDefaultNamedMeal() {
        return driver.findElements(By.cssSelector(".meal-card-name")).stream()
                .anyMatch(el -> el.getText().matches("Meal \\d+"));
    }

    public void waitForMealCount(int expected) {
        wait.until(d -> d.findElements(By.cssSelector(".meal-card-name")).size() == expected);
    }

    public void waitForNutritionTotal(String text) {
        wait.until(ExpectedConditions.textToBePresentInElementLocated(
                By.cssSelector(".nutrition-totals"), text));
    }

    // ── Workout ──────────────────────────────────────────────────────────────

    private static final By WORKOUT_DELETE_BTN = By.xpath(
            "(//div[contains(@class,'section-box')])[" + WORKOUT_IDX +
                    "]//button[contains(@class,'btn-danger') and text()='Delete']");
    private static final By WORKOUT_START_BTN = By.xpath(
            "(//div[contains(@class,'section-box')])[" + WORKOUT_IDX +
                    "]//button[contains(text(),'Start Workout')]");
    private static final By WORKOUT_ADD_EXERCISE_BTN = By.xpath(
            "(//div[contains(@class,'section-box')])[" + WORKOUT_IDX +
                    "]//button[contains(text(),'+ Exercise')]");

    /**
     * Wait for the workout section to finish its initial render. Either
     * "Start Workout" (no session) or "Delete" (existing session) must be
     * visible. Without this, downstream interactions race against React.
     */
    private void waitForWorkoutSectionReady() {
        wait.until(d ->
                !d.findElements(WORKOUT_START_BTN).isEmpty()
                || !d.findElements(WORKOUT_DELETE_BTN).isEmpty());
    }

    public void deleteWorkoutIfExists() {
        waitForWorkoutSectionReady();
        // Loop: an account can have multiple workout sessions per day if
        // seeded directly via the API. Click Delete until none remain.
        while (!driver.findElements(WORKOUT_DELETE_BTN).isEmpty()) {
            try {
                driver.findElements(WORKOUT_DELETE_BTN).get(0).click();
            } catch (Exception ignored) {
                // Stale element from a re-render — re-query on next iteration.
                continue;
            }
            // After a delete, either another Delete remains (more sessions) or
            // Start Workout appears (last one gone). Either way is "ready".
            wait.until(d ->
                    !d.findElements(WORKOUT_START_BTN).isEmpty()
                    || !d.findElements(WORKOUT_DELETE_BTN).isEmpty());
        }
    }

    public void clickAddWorkout() {
        waitForWorkoutSectionReady();
        wait.until(d -> {
            List<WebElement> starts = d.findElements(WORKOUT_START_BTN);
            for (WebElement btn : starts) {
                try { if (btn.isDisplayed() && btn.isEnabled()) { btn.click(); return true; } }
                catch (Exception ignored) {}
            }
            List<WebElement> exercises = d.findElements(WORKOUT_ADD_EXERCISE_BTN);
            for (WebElement btn : exercises) {
                try { if (btn.isDisplayed() && btn.isEnabled()) { btn.click(); return true; } }
                catch (Exception ignored) {}
            }
            return false;
        });
    }

    public void renameWorkoutSession(String newName) {
        sectionBtnExact(WORKOUT_IDX, "Rename").click();
        WebElement input = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector(".section-box:nth-child(" + cssNth(WORKOUT_IDX) + ") input[type='text']")));
        input.clear();
        input.sendKeys(newName);
        driver.findElement(By.xpath(
                "(//div[contains(@class,'section-box')])[" + WORKOUT_IDX +
                        "]//button[contains(@class,'btn-primary') and text()='Save']")).click();
    }

    public void waitForSessionName(String name) {
        wait.until(ExpectedConditions.textToBePresentInElementLocated(
                By.cssSelector(".section-box:nth-child(" + cssNth(WORKOUT_IDX) +
                        ") .section-title .muted"),
                name));
    }

    // ── Exercises ────────────────────────────────────────────────────────────

    public void waitForExercise(String name) {
        wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.xpath("//span[contains(@class,'exercise-card-name') and contains(text(),'" + name + "')]")));
    }

    public void waitForExerciseDetail(String exerciseName, String detail) {
        try {
            wait.until(d -> {
                List<WebElement> cards = d.findElements(
                        By.xpath("//div[contains(@class,'exercise-card')]"));
                for (WebElement card : cards) {
                    String cardText = card.getText();
                    if (cardText.contains(exerciseName) && cardText.contains(detail)) return true;
                }
                return false;
            });
        } catch (org.openqa.selenium.TimeoutException e) {
            // Dump card contents to make diagnosis possible — we couldn't find the
            // expected detail, so the test author needs to see what's actually rendered.
            System.err.println(">>> waitForExerciseDetail FAILED — expected name='" + exerciseName
                    + "' detail='" + detail + "'. Dumping all exercise-card text:");
            List<WebElement> cards = driver.findElements(
                    By.xpath("//div[contains(@class,'exercise-card')]"));
            if (cards.isEmpty()) {
                System.err.println("    (no exercise-card elements on page)");
            } else {
                for (int i = 0; i < cards.size(); i++) {
                    String text = cards.get(i).getText().replace("\n", " | ");
                    System.err.println("    card[" + i + "]: " + text);
                }
            }
            throw e;
        }
    }

    public void assertExerciseDoesNotShowWeight(String name) {
        List<WebElement> items = driver.findElements(By.xpath(
                "//div[contains(@class,'exercise-card')]" +
                        "[.//span[contains(text(),'" + name + "')]]" +
                        "[.//span[contains(text(),'lbs')]]"));
        if (!items.isEmpty()) {
            throw new AssertionError("Expected no weight display for " + name + " but found one");
        }
    }

    public void clickEditExercise(int index) {
        By editBtns = By.cssSelector(".exercise-card .btn.btn-sm");
        wait.until(d -> d.findElements(editBtns).size() > index);
        driver.findElements(editBtns).get(index).click();
    }

    public boolean isTextVisible(String text) {
        return !driver.findElements(By.xpath("//*[contains(text(),'" + text + "')]")).isEmpty();
    }

    public boolean isExerciseVisible(String name) {
        return !driver.findElements(By.xpath(
                "//span[contains(@class,'exercise-card-name') and contains(text(),'" + name + "')]"))
                .isEmpty();
    }
}
