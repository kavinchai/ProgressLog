package com.kavin.fitness.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Sends plain-text email through Resend's HTTPS API (outgoing SMTP isn't available on the host).
 * Without an API key nothing is sent: the email is logged at debug level instead, for local use.
 */
@Slf4j
@Service
public class EmailService {

    private static final URI RESEND = URI.create("https://api.resend.com/emails");

    private final String apiKey;
    private final String from;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient http =
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    public EmailService(
            @Value("${app.mail.resend-api-key:}") String apiKey,
            @Value("${app.mail.from:Progress Logger <onboarding@resend.dev>}") String from) {
        this.apiKey = apiKey;
        this.from = from;
    }

    /** Best effort: a failure is logged, never thrown. */
    public void send(String to, String subject, String text) {
        if (apiKey.isBlank()) {
            log.warn("Email not sent (RESEND_API_KEY isn't set): subject={}", subject);
            log.debug("Email to={} subject={}\n{}", to, subject, text);
            return;
        }
        try {
            String body =
                    objectMapper.writeValueAsString(
                            Map.of(
                                    "from",
                                    from,
                                    "to",
                                    List.of(to),
                                    "subject",
                                    subject,
                                    "text",
                                    text));
            HttpRequest request =
                    HttpRequest.newBuilder(RESEND)
                            .timeout(Duration.ofSeconds(10))
                            .header("Authorization", "Bearer " + apiKey)
                            .header("Content-Type", "application/json")
                            .POST(HttpRequest.BodyPublishers.ofString(body))
                            .build();
            HttpResponse<String> response =
                    http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                log.warn("Email send failed: HTTP {} {}", response.statusCode(), response.body());
            }
        } catch (IOException | RuntimeException e) {
            log.warn("Email send failed: {}", e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
