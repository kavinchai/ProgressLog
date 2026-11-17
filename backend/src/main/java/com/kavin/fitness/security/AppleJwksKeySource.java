package com.kavin.fitness.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Fetches Apple's published signing keys and caches them. Apple rotates keys, so an unknown key id
 * triggers a refetch (at most once a minute).
 */
@Slf4j
@Component
public class AppleJwksKeySource implements AppleKeySource {

    private static final URI KEYS_URL = URI.create("https://appleid.apple.com/auth/keys");
    private static final Duration REFETCH_AFTER = Duration.ofMinutes(1);

    private final ObjectMapper objectMapper;
    private final HttpClient http =
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private volatile Map<String, PublicKey> keys = Map.of();
    private volatile Instant lastFetch = Instant.EPOCH;

    public AppleJwksKeySource(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public PublicKey publicKey(String kid) {
        PublicKey key = keys.get(kid);
        if (key == null && Instant.now().isAfter(lastFetch.plus(REFETCH_AFTER))) {
            refresh();
            key = keys.get(kid);
        }
        return key;
    }

    private synchronized void refresh() {
        lastFetch = Instant.now();
        try {
            HttpRequest request =
                    HttpRequest.newBuilder(KEYS_URL).timeout(Duration.ofSeconds(5)).GET().build();
            String body = http.send(request, HttpResponse.BodyHandlers.ofString()).body();
            keys = parse(objectMapper.readTree(body));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Fetching Apple's sign-in keys was interrupted");
        } catch (IOException | GeneralSecurityException | RuntimeException e) {
            log.warn("Couldn't fetch Apple's sign-in keys: {}", e.getMessage());
        }
    }

    private static Map<String, PublicKey> parse(JsonNode jwks) throws GeneralSecurityException {
        Map<String, PublicKey> parsed = new HashMap<>();
        KeyFactory rsa = KeyFactory.getInstance("RSA");
        for (JsonNode jwk : jwks.path("keys")) {
            if (!"RSA".equals(jwk.path("kty").asText())) continue;
            BigInteger modulus = new BigInteger(1, decode(jwk.path("n").asText()));
            BigInteger exponent = new BigInteger(1, decode(jwk.path("e").asText()));
            parsed.put(
                    jwk.path("kid").asText(),
                    rsa.generatePublic(new RSAPublicKeySpec(modulus, exponent)));
        }
        return Map.copyOf(parsed);
    }

    private static byte[] decode(String base64Url) {
        return Base64.getUrlDecoder().decode(base64Url);
    }
}
