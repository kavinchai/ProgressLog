package com.kavin.fitness.dto;

import jakarta.validation.constraints.Size;

public class UpdateCredentialsRequest {

    // Required unless the account was created with Apple and has no password yet.
    private String currentPassword;

    @Size(min = 3, max = 50)
    private String newUsername;

    @Size(min = 6)
    private String newPassword;

    public String getCurrentPassword() {
        return currentPassword;
    }

    public void setCurrentPassword(String v) {
        this.currentPassword = v;
    }

    public String getNewUsername() {
        return newUsername;
    }

    public void setNewUsername(String v) {
        this.newUsername = v;
    }

    public String getNewPassword() {
        return newPassword;
    }

    public void setNewPassword(String v) {
        this.newPassword = v;
    }
}
