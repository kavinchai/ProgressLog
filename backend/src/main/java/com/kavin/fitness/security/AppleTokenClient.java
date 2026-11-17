package com.kavin.fitness.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Talks to Apple's token endpoints so account deletion can revoke the Apple sign-in, as App Store
 * rules require. Needs a "Sign in with Apple" key from the Apple Developer account; until one is
 * configured it does nothing.
 */
@Slf4j
@Component
public class AppleTokenClient {

    private static final String APPLE = "https://appleid.apple.com";

    private final String clientId;
    private final String teamId;
    private final String keyId;
    private final PrivateKey privateKey;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient http =
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    public AppleTokenClient(
            @Value("${app.apple.client-id:com.kavin.progresslog}") String clientId,
            @Value("${app.apple.team-id:}") String teamId,
            @Value("${app.apple.key-id:}") String keyId,
            @Value("${app.apple.private-key:}") String privateKeyPem) {
        this.clientId = clientId;
        this.teamId = teamId;
        this.keyId = keyId;
        this.privateKey = parsePrivateKey(privateKeyPem);
    }

    public boolean isConfigured() {
        return privateKey != null && !teamId.isBlank() && !keyId.isBlank();
    }

    /** Swaps the one-time code from the app for a refresh token, if the key is configured. */
    public Optional<String> exchangeForRefreshToken(String authorizationCode) {
        if (!isConfigured() || authorizationCode == null || authorizationCode.isBlank()) {
            return Optional.empty();
        }
        try {
            JsonNode response =
                    post(
                            "/auth/token",
                            Map.of(
                                    "client_id",
                                    clientId,
                                    "client_secret",
                                    clientSecret(),
                                    "code",
                                    authorizationCode,
                                    "grant_type",
                                    "authorization_code"));
            return Optional.ofNullable(response.path("refresh_token").asText(null));
        } catch (IOException | RuntimeException e) {
            log.warn("Apple token exchange failed: {}", e.getMessage());
            return Optional.empty();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        }
    }

    /** Revokes the Apple sign-in. Best effort: a failure is logged, never thrown. */
    public void revoke(String refreshToken) {
        if (!isConfigured() || refreshToken == null) return;
        try {
            post(
                    "/auth/revoke",
                    Map.of(
                            "client_id",
                            clientId,
                            "client_secret",
                            clientSecret(),
                            "token",
                            refreshToken,
                            "token_type_hint",
                            "refresh_token"));
        } catch (IOException | RuntimeException e) {
            log.warn("Apple sign-in revoke failed: {}", e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    /** The short-lived client secret Apple wants: a JWT signed with the Apple key. */
    String clientSecret() {
        Instant now = Instant.now();
        return Jwts.builder()
                .header()
                .keyId(keyId)
                .and()
                .issuer(teamId)
                .subject(clientId)
                .audience()
                .add(APPLE)
                .and()
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(Duration.ofMinutes(5))))
                .signWith(privateKey, Jwts.SIG.ES256)
                .compact();
    }

    private JsonNode post(String path, Map<String, String> form)
            throws IOException, InterruptedException {
        String body =
                form.entrySet().stream()
                        .map(e -> encode(e.getKey()) + "=" + encode(e.getValue()))
                        .collect(Collectors.joining("&"));
        HttpRequest request =
                HttpRequest.newBuilder(URI.create(APPLE + path))
                        .timeout(Duration.ofSeconds(10))
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .POST(HttpRequest.BodyPublishers.ofString(body))
                        .build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 300) {
            throw new IOException("Apple returned HTTP " + response.statusCode());
        }
        return response.body().isBlank()
                ? objectMapper.missingNode()
                : objectMapper.readTree(response.body());
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static PrivateKey parsePrivateKey(String pem) {
        if (pem == null || pem.isBlank()) return null;
        try {
            String base64 =
                    pem.replace("\\n", "\n")
                            .replaceAll("-----(BEGIN|END) PRIVATE KEY-----", "")
                            .replaceAll("\\s", "");
            return KeyFactory.getInstance("EC")
                    .generatePrivate(new PKCS8EncodedKeySpec(Base64.getDecoder().decode(base64)));
        } catch (Exception e) {
            log.error("APPLE_PRIVATE_KEY isn't a valid .p8 key; Apple revoke is off");
            return null;
        }
    }
}
