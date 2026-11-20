package com.kavin.fitness.e2e.pages;

import com.microsoft.playwright.Page;

public class LoginPage {
    private final Page page;

    public LoginPage(Page page) {
        this.page = page;
    }

    public LoginPage open(String baseUrl) {
        page.navigate(baseUrl + "/login");
        page.locator("#username").waitFor();
        return this;
    }

    /** Follows the "Privacy policy" link under the form and waits for the policy page. */
    public void openPrivacyPolicy() {
        page.locator("a.login-privacy-link").click();
        page.locator("h1.privacy-title").waitFor();
    }

    /** Ticks or unticks "Keep me signed in" under the password field. */
    public LoginPage setKeepSignedIn(boolean keep) {
        page.locator("#remember-me").setChecked(keep);
        return this;
    }

    /** Whether a button on the form has this class (e.g. "login-apple-btn"). Call after open(). */
    public boolean hasButton(String cssClass) {
        return page.locator("button." + cssClass).count() > 0;
    }

    /** Whether any button's name mentions Apple, whatever its class. Call after open(). */
    public boolean hasAppleButtonText() {
        return page.getByRole(com.microsoft.playwright.options.AriaRole.BUTTON,
                new Page.GetByRoleOptions().setName(java.util.regex.Pattern.compile("with Apple")))
                .count() > 0;
    }

    /** Follows "Forgot password?" under the password field to the reset page. */
    public ForgotPasswordPage openForgotPassword() {
        page.locator("a.login-forgot").click();
        page.locator("#identifier").waitFor();
        return new ForgotPasswordPage(page);
    }

    public void login(String username, String password) {
        page.locator("#username").fill(username);
        page.locator("#password").fill(password);
        page.locator("button.login-btn[type='submit']").click();
    }
}
