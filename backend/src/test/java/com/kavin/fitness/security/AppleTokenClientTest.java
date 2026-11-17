package com.kavin.fitness.security;

import static org.assertj.core.api.Assertions.assertThat;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;
import org.junit.jupiter.api.Test;

class AppleTokenClientTest {

    @Test
    void isOffUntilTheAppleKeyIsConfigured() {
        AppleTokenClient client = new AppleTokenClient("com.kavin.progresslog", "", "", "");

        assertThat(client.isConfigured()).isFalse();
        assertThat(client.exchangeForRefreshToken("some-code")).isEmpty();
    }

    @Test
    void signsTheClientSecretWithTheAppleKey() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair keys = generator.generateKeyPair();
        // Env vars often carry the .p8 key with literal "\n" instead of line breaks.
        String pem =
                "-----BEGIN PRIVATE KEY-----\\n"
                        + Base64.getEncoder().encodeToString(keys.getPrivate().getEncoded())
                        + "\\n-----END PRIVATE KEY-----";

        AppleTokenClient client =
                new AppleTokenClient("com.kavin.progresslog", "TEAM123456", "KEY1234567", pem);

        assertThat(client.isConfigured()).isTrue();
        Jws<Claims> secret =
                Jwts.parser()
                        .verifyWith(keys.getPublic())
                        .build()
                        .parseSignedClaims(client.clientSecret());
        assertThat(secret.getHeader().getKeyId()).isEqualTo("KEY1234567");
        assertThat(secret.getHeader().getAlgorithm()).isEqualTo("ES256");
        assertThat(secret.getPayload().getIssuer()).isEqualTo("TEAM123456");
        assertThat(secret.getPayload().getSubject()).isEqualTo("com.kavin.progresslog");
        assertThat(secret.getPayload().getAudience()).containsExactly("https://appleid.apple.com");
        assertThat(secret.getPayload().getExpiration()).isInTheFuture();
    }
}
