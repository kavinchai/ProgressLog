package com.kavin.fitness.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Confirms an account deletion: the password, or for an account created with Apple (no password) a
 * fresh Sign in with Apple identity token.
 */
@Getter
@Setter
@NoArgsConstructor
public class DeleteAccountRequest {
    private String password;
    private String appleIdentityToken;
}
