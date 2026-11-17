package com.kavin.fitness.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A first Apple sign-in, with the username the person picked. */
@Getter
@Setter
@NoArgsConstructor
public class AppleRegisterRequest {
    private String identityToken;
    private String authorizationCode;

    @NotBlank
    @Size(min = 3, max = 50)
    private String username;

    private boolean rememberMe;
}
