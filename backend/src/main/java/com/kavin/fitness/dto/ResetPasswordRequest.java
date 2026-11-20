package com.kavin.fitness.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ResetPasswordRequest {

    /** The username or email the code was asked for with. */
    @NotBlank private String identifier;

    @NotBlank
    @Pattern(regexp = "\\d{6}", message = "Enter the 6-digit code from the email.")
    private String code;

    @NotBlank
    @Size(min = 6, message = "Password must be at least 6 characters.")
    private String newPassword;
}
