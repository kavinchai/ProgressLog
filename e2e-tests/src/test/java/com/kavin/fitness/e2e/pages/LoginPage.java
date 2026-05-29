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

    public void login(String username, String password) {
        page.locator("#username").fill(username);
        page.locator("#password").fill(password);
        page.locator("button.login-btn[type='submit']").click();
    }

    public LoginPage openForgotPassword() {
        page.locator("button.login-forgot-btn").click();
        page.locator("#email").waitFor();
        return this;
    }

    public void submitForgotPassword(String username, String email) {
        page.locator("#username").fill(username);
        page.locator("#email").fill(email);
        page.locator("button.login-btn[type='submit']").click();
    }

    public String forgotPasswordConfirmationText() {
        page.locator(".login-info").waitFor();
        return page.locator(".login-info").innerText();
    }
}
