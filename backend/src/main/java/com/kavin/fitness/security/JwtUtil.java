package com.kavin.fitness.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;
import java.util.Optional;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtUtil {

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiration-ms:86400000}")
    private long expirationMs;

    @Value("${app.jwt.remember-me-expiration-ms:2592000000}")
    private long rememberMeExpirationMs;

    private SecretKey key;
    private JwtParser parser;

    @PostConstruct
    public void init() {
        // HMAC-SHA key derived from the configured secret
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        this.key = Keys.hmacShaKeyFor(keyBytes);
        // Built once here: jjwt's first parser build isn't safe when two requests race.
        this.parser = Jwts.parser().verifyWith(key).build();
    }

    /** How long a sign-in lasts: 30 days with "Keep me signed in", otherwise a day. */
    public Duration lifetime(boolean rememberMe) {
        return Duration.ofMillis(rememberMe ? rememberMeExpirationMs : expirationMs);
    }

    public String generateToken(String username) {
        return generateToken(username, lifetime(false));
    }

    public String generateToken(String username, Duration lifetime) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + lifetime.toMillis());

        return Jwts.builder()
                .subject(username)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    public String extractUsername(String token) {
        return parseClaims(token).getSubject();
    }

    /** Time left before this token expires, or empty if it is missing, invalid or expired. */
    public Optional<Duration> timeLeft(String token) {
        try {
            Date expiry = parseClaims(token).getExpiration();
            return Optional.of(Duration.ofMillis(expiry.getTime() - System.currentTimeMillis()));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims parseClaims(String token) {
        return parser.parseSignedClaims(token).getPayload();
    }
}
