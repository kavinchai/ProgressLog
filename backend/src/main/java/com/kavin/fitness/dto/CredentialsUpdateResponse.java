package com.kavin.fitness.dto;

public class CredentialsUpdateResponse {

    private String token;
    private String username;

    public CredentialsUpdateResponse(String token, String username) {
        this.token    = token;
        this.username = username;
    }

    public String getToken()    { return token; }
    public String getUsername() { return username; }
}
