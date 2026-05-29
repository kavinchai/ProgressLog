package com.kavin.fitness.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class ForgotPasswordRequest {

    @NotBlank
    private String username;

    @NotBlank
    private String email;
}
