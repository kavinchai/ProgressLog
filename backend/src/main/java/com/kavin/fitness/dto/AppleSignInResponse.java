package com.kavin.fitness.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Getter;

/** Either the signed-in username, or needsUsername for an Apple ID with no account yet. */
@Getter
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AppleSignInResponse {
    private String username;
    private boolean needsUsername;
}
