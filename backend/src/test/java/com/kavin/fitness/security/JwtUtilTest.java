package com.kavin.fitness.security;

import static org.junit.jupiter.api.Assertions.*;

import java.time.Duration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class JwtUtilTest {

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret", "test-secret-key-at-least-32-chars-long!");
        ReflectionTestUtils.setField(jwtUtil, "expirationMs", 86400000L);
        jwtUtil.init();
    }

    @Test
    void generateToken_returnsNonBlankToken() {
        String token = jwtUtil.generateToken("alice");
        assertNotNull(token);
        assertFalse(token.isBlank());
    }

    @Test
    void extractUsername_returnsCorrectUsername() {
        String token = jwtUtil.generateToken("alice");
        assertEquals("alice", jwtUtil.extractUsername(token));
    }

    @Test
    void validateToken_trueForValidToken() {
        String token = jwtUtil.generateToken("bob");
        assertTrue(jwtUtil.validateToken(token));
    }

    @Test
    void validateToken_falseForTamperedToken() {
        String token = jwtUtil.generateToken("bob") + "tampered";
        assertFalse(jwtUtil.validateToken(token));
    }

    @Test
    void validateToken_falseForGarbage() {
        assertFalse(jwtUtil.validateToken("not.a.token"));
    }

    @Test
    void lifetime_isThirtyDaysWhenKeptSignedIn_otherwiseOneDay() {
        ReflectionTestUtils.setField(jwtUtil, "rememberMeExpirationMs", 2592000000L);
        assertEquals(Duration.ofDays(30), jwtUtil.lifetime(true));
        assertEquals(Duration.ofDays(1), jwtUtil.lifetime(false));
    }

    @Test
    void generateToken_withLifetime_isValidAndCarriesUsername() {
        String token = jwtUtil.generateToken("carol", Duration.ofDays(30));
        assertTrue(jwtUtil.validateToken(token));
        assertEquals("carol", jwtUtil.extractUsername(token));
    }

    @Test
    void generateToken_withExpiredLifetime_isInvalid() {
        String token = jwtUtil.generateToken("carol", Duration.ofSeconds(-1));
        assertFalse(jwtUtil.validateToken(token));
    }

    @Test
    void timeLeft_isAboutTheLifetimeForAFreshToken() {
        String token = jwtUtil.generateToken("dave", Duration.ofDays(30));
        Duration left = jwtUtil.timeLeft(token).orElseThrow();
        assertTrue(left.compareTo(Duration.ofDays(30)) <= 0);
        assertTrue(left.compareTo(Duration.ofDays(30).minusMinutes(1)) > 0);
    }

    @Test
    void timeLeft_isEmptyForMissingOrInvalidTokens() {
        assertTrue(jwtUtil.timeLeft(null).isEmpty());
        assertTrue(jwtUtil.timeLeft("not.a.token").isEmpty());
        assertTrue(
                jwtUtil.timeLeft(jwtUtil.generateToken("dave", Duration.ofSeconds(-1))).isEmpty());
    }
}
