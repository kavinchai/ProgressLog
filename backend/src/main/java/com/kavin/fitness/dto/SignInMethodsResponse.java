package com.kavin.fitness.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/** How this account can sign in. */
@Getter
@AllArgsConstructor
public class SignInMethodsResponse {
    private boolean appleConnected;
    private boolean passwordSet;
}
