package com.kavin.fitness.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** What the iPhone app gets back from the Apple sheet. */
@Getter
@Setter
@NoArgsConstructor
public class AppleSignInRequest {
    private String identityToken;
    private String authorizationCode;
    private boolean rememberMe;
}
