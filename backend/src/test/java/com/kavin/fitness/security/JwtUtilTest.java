package com.kavin.fitness.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

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
}
