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

    public void login(String username, String password) {
        page.locator("#username").fill(username);
        page.locator("#password").fill(password);
        page.locator("button.login-btn[type='submit']").click();
    }
}
