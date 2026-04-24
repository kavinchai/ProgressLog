package com.kavin.fitness.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter @NoArgsConstructor
public class PasswordVerifyRequest {
    @NotBlank
    private String password;
}
