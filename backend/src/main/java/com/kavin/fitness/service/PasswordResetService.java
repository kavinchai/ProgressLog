package com.kavin.fitness.service;

import com.kavin.fitness.model.PasswordResetToken;
import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.PasswordResetTokenRepository;
import com.kavin.fitness.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Optional;

@Slf4j
@Service
public class PasswordResetService {

    @Autowired private UserRepository userRepository;
    @Autowired private PasswordResetTokenRepository tokenRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private MailService mailService;

    @Value("${app.base-url:http://localhost:5173}")
    private String appBaseUrl;

    @Value("${app.password-reset.ttl-minutes:5}")
    private long tokenTtlMinutes;

    private static final SecureRandom RANDOM = new SecureRandom();

    /**
     * Always returns silently. Caller surfaces the same response regardless of
     * whether a token was actually issued, so the endpoint does not reveal
     * whether the username exists.
     */
    public void requestReset(String username, String email) {
        if (username == null || email == null) return;

        Optional<User> maybeUser = userRepository.findByUsername(username.trim());
        if (maybeUser.isEmpty()) {
            log.info("Password reset requested for unknown username — ignoring");
            return;
        }
        User user = maybeUser.get();

        if (user.getEmail() == null || !user.getEmail().equalsIgnoreCase(email.trim())) {
            log.info("Password reset email mismatch for user={} — ignoring", user.getUsername());
            return;
        }

        String rawToken = generateRawToken();
        PasswordResetToken token = new PasswordResetToken();
        token.setUser(user);
        token.setTokenHash(hashToken(rawToken));
        token.setExpiresAt(Instant.now().plus(tokenTtlMinutes, ChronoUnit.MINUTES));
        tokenRepository.save(token);

        String resetUrl = appBaseUrl + "/reset-password?token=" + rawToken;
        String body = """
                Hi %s,

                We received a request to reset your ProgressLog password. Click the link below
                to choose a new password:

                %s

                This link expires in %d minutes. If you did not request a password reset,
                you can safely ignore this email — your password will not change.

                — ProgressLog
                """.formatted(user.getUsername(), resetUrl, tokenTtlMinutes);

        try {
            mailService.send(user.getEmail(), "Reset your ProgressLog password", body);
            log.info("Password reset token issued for user={}", user.getUsername());
        } catch (RuntimeException ex) {
            // Swallow so the endpoint still returns 204 — otherwise a 5xx leaks
            // that the username exists. The token row stays in the DB unused.
            log.error("Password reset email failed to send for user={} — endpoint will still return 204",
                    user.getUsername(), ex);
        }
    }

    public void resetPassword(String rawToken, String newPassword) {
        if (rawToken == null || rawToken.isBlank() || newPassword == null || newPassword.isBlank()) {
            throw new IllegalArgumentException("Invalid or expired reset link.");
        }

        PasswordResetToken token = tokenRepository.findByTokenHash(hashToken(rawToken))
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired reset link."));

        if (token.getUsedAt() != null) {
            throw new IllegalArgumentException("Invalid or expired reset link.");
        }
        if (token.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Invalid or expired reset link.");
        }

        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        token.setUsedAt(Instant.now());
        tokenRepository.save(token);
        log.info("Password reset completed for user={}", user.getUsername());
    }

    private static String generateRawToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** Package-private so tests can hash deterministically. */
    static String hashToken(String rawToken) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
