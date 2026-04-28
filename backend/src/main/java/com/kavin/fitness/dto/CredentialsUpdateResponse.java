package com.kavin.fitness.dto;

public class CredentialsUpdateResponse {

    private String username;

    public CredentialsUpdateResponse(String username) {
        this.username = username;
    }

    public String getUsername() { return username; }
}
