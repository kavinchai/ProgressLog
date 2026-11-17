package com.kavin.fitness.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class AppleIdentityVerifierTest {

    private final AppleIdentityVerifier verifier =
            new AppleIdentityVerifier(
                    kid -> AppleTestTokens.KID.equals(kid) ? AppleTestTokens.publicKey() : null,
                    AppleTestTokens.CLIENT_ID);

    @Test
    void acceptsAValidAppleToken() {
        AppleIdentityVerifier.AppleIdentity identity =
                verifier.verify(
                        AppleTestTokens.token("apple-user-1", "me@privaterelay.appleid.com"));

        assertThat(identity.subject()).isEqualTo("apple-user-1");
        assertThat(identity.email()).isEqualTo("me@privaterelay.appleid.com");
    }

    @Test
    void emailIsOptional() {
        assertThat(verifier.verify(AppleTestTokens.token("apple-user-1", null)).email()).isNull();
    }

    @Test
    void rejectsATokenForAnotherApp() {
        assertRejected(AppleTestTokens.tokenForAudience("apple-user-1", "com.someone.else"));
    }

    @Test
    void rejectsATokenNotIssuedByApple() {
        assertRejected(AppleTestTokens.tokenFromIssuer("apple-user-1", "https://evil.example"));
    }

    @Test
    void rejectsAnExpiredToken() {
        assertRejected(AppleTestTokens.expiredToken("apple-user-1"));
    }

    @Test
    void rejectsATokenSignedWithAnotherKey() {
        assertRejected(AppleTestTokens.forgedToken("apple-user-1"));
    }

    @Test
    void rejectsGarbageAndBlankTokens() {
        assertRejected("not-a-token");
        assertRejected("");
        assertRejected(null);
    }

    private void assertRejected(String token) {
        assertThatThrownBy(() -> verifier.verify(token))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Sign in with Apple couldn't be verified. Try again.");
    }
}
