package com.kavin.fitness.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.WaitForSelectorState;

public class TemplatesPage {
    private final Page page;

    private static final String PAGE_TITLE = ".templates-title";
    private static final String NEW_BTN = "button.btn-primary:has-text(\"+ New\")";
    private static final String TEMPLATE_CARDS = ".template-card";
    private static final String TEMPLATE_NAMES = ".template-card-name";
    private static final String EMPTY_MESSAGE = ".templates-empty";

    private static final String MODAL_TITLE = ".modal-title";
    private static final String TEMPLATE_NAME_INPUT = ".modal-box input[placeholder*='Push Day' i]";
    private static final String MODAL_SAVE =
            ".modal-box >> button.btn-primary:has-text(\"Save\"), .modal-box >> button.btn-primary:has-text(\"Saving\")";
    private static final String MODAL_CANCEL = ".modal-box >> button.btn-ghost";

    public TemplatesPage(Page page) {
        this.page = page;
    }

    public void open(String baseUrl) {
        page.navigate(baseUrl + "/templates");
        page.locator(PAGE_TITLE).waitFor();
    }

    public String getPageTitle() {
        return page.locator(PAGE_TITLE).innerText();
    }

    public void clickNewTemplate() {
        page.locator(NEW_BTN).click();
    }

    public void waitForModalVisible(String expectedTitle) {
        page.locator(MODAL_TITLE).waitFor();
        String actual = page.locator(MODAL_TITLE).innerText();
        if (!actual.contains(expectedTitle)) {
            throw new AssertionError("Expected modal title '" + expectedTitle + "' but got: " + actual);
        }
    }

    public void enterTemplateName(String name) {
        page.locator(TEMPLATE_NAME_INPUT).fill(name);
    }

    public void clickModalSave() {
        page.locator(MODAL_SAVE).first().click();
    }

    public void clickModalCancel() {
        page.locator(MODAL_CANCEL).click();
    }

    public int getTemplateCount() {
        return page.locator(TEMPLATE_CARDS).count();
    }

    public boolean isTemplateVisible(String name) {
        return page.locator(TEMPLATE_NAMES, new Page.LocatorOptions().setHasText(name)).count() > 0;
    }

    public void waitForTemplateVisible(String name) {
        page.locator(TEMPLATE_NAMES, new Page.LocatorOptions().setHasText(name)).first().waitFor();
    }

    public void clickDeleteTemplate(String name) {
        Locator card = page.locator(TEMPLATE_CARDS, new Page.LocatorOptions().setHasText(name));
        if (card.count() == 0) {
            throw new AssertionError("Template '" + name + "' not found");
        }
        card.first().locator(".btn-danger").click();
        confirmDeleteAndDismiss();
    }

    public void clickEditTemplate(String name) {
        Locator card = page.locator(TEMPLATE_CARDS, new Page.LocatorOptions().setHasText(name));
        if (card.count() == 0) {
            throw new AssertionError("Template '" + name + "' not found");
        }
        card.first().locator("button.btn.btn-sm", new Locator.LocatorOptions().setHasText("Edit")).click();
    }

    public void clickUseTemplate(String name) {
        Locator card = page.locator(TEMPLATE_CARDS, new Page.LocatorOptions().setHasText(name));
        if (card.count() == 0) {
            throw new AssertionError("Template '" + name + "' not found");
        }
        card.first().locator(".btn-primary").click();
    }

    public void waitForTemplateRemoved(String name) {
        page.locator(TEMPLATE_NAMES, new Page.LocatorOptions().setHasText(name))
                .first()
                .waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.DETACHED));
    }

    public boolean isEmptyMessageVisible() {
        Locator el = page.locator(EMPTY_MESSAGE);
        return el.count() > 0 && el.first().isVisible();
    }

    /**
     * After clicking a delete button that opens a ConfirmDeleteModal,
     * click "Confirm Delete", wait for success, then click "Done".
     */
    private void confirmDeleteAndDismiss() {
        page.locator(".modal-box >> button:has-text(\"Confirm Delete\")").click();
        page.locator(".modal-box >> button:has-text(\"Done\")").click();
        page.locator(MODAL_TITLE).first().waitFor(
                new Locator.WaitForOptions().setState(WaitForSelectorState.HIDDEN));
    }
}
