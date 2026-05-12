package com.kavin.fitness.e2e.tests;

import com.kavin.fitness.e2e.pages.TemplatesPage;
import com.kavin.fitness.e2e.support.BaseTest;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

public class TemplatesPageTest extends BaseTest {
    private TemplatesPage templates;

    @BeforeClass(dependsOnMethods = "setUpDriverAndLogIn")
    public void initPages() {
        templates = new TemplatesPage(driver);
        templates.open(baseUrl);
    }

    @Test(priority = 1)
    public void templatesPageLoads() {
        step("verify page title is 'Templates'");
        String title = templates.getPageTitle();
        if (!"Templates".equals(title)) {
            throw new AssertionError("Expected 'Templates' but got: " + title);
        }
    }

    @Test(priority = 2)
    public void newTemplateButtonOpensModal() {
        step("click + New button");
        templates.clickNewTemplate();

        step("verify 'New Template' modal appears");
        templates.waitForModalVisible("New Template");

        step("cancel the modal");
        templates.clickModalCancel();
        waitForModalClosed();
    }

    @Test(priority = 3)
    public void createNewTemplate() {
        step("click + New button");
        templates.clickNewTemplate();
        templates.waitForModalVisible("New Template");

        step("enter template name 'E2E Push Day'");
        templates.enterTemplateName("E2E Push Day");

        step("save the template");
        templates.clickModalSave();
        waitForModalClosed();

        step("verify template appears in list");
        templates.waitForTemplateVisible("E2E Push Day");
    }

    @Test(priority = 4, dependsOnMethods = "createNewTemplate")
    public void editExistingTemplate() {
        step("click Edit on 'E2E Push Day'");
        templates.clickEditTemplate("E2E Push Day");
        templates.waitForModalVisible("Edit Template");

        step("rename to 'E2E Pull Day'");
        templates.enterTemplateName("E2E Pull Day");
        templates.clickModalSave();
        waitForModalClosed();

        step("verify renamed template appears");
        templates.waitForTemplateVisible("E2E Pull Day");
    }

    @Test(priority = 5, dependsOnMethods = "editExistingTemplate")
    public void deleteTemplate() {
        step("click Delete on 'E2E Pull Day'");
        templates.clickDeleteTemplate("E2E Pull Day");

        step("verify template is removed from list");
        templates.waitForTemplateRemoved("E2E Pull Day");
    }
}
