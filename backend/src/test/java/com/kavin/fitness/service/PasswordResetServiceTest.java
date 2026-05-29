package com.kavin.fitness.service;

import com.kavin.fitness.model.PasswordResetToken;
import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.PasswordResetTokenRepository;
import com.kavin.fitness.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock UserRepository userRepository;
    @Mock PasswordResetTokenRepository tokenRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock MailService mailService;
    @InjectMocks PasswordResetService service;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setUsername("alice");
        user.setEmail("alice@example.com");
        user.setPassword("$2a$10$old-hash");
        ReflectionTestUtils.setField(user, "id", 1L);
        ReflectionTestUtils.setField(service, "appBaseUrl", "http://localhost:5173");
        ReflectionTestUtils.setField(service, "tokenTtlMinutes", 5L);
    }

    // ── requestReset ──────────────────────────────────────────────────────────

    @Test
    void requestReset_createsTokenAndSendsEmail_whenUsernameAndEmailMatch() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));

        service.requestReset("alice", "alice@example.com");

        ArgumentCaptor<PasswordResetToken> tokenCaptor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(tokenRepository).save(tokenCaptor.capture());
        PasswordResetToken saved = tokenCaptor.getValue();

        assertSame(user, saved.getUser());
        assertNotNull(saved.getTokenHash());
        assertEquals(64, saved.getTokenHash().length(), "SHA-256 hex must be 64 chars");
        assertNull(saved.getUsedAt());

        // Expiry is ~5 minutes from now
        long secondsToExpiry = saved.getExpiresAt().getEpochSecond() - Instant.now().getEpochSecond();
        assertTrue(secondsToExpiry > 4 * 60 && secondsToExpiry <= 5 * 60,
                "expected ~5 minutes to expiry, got " + secondsToExpiry + "s");

        verify(mailService).send(eq("alice@example.com"), any(), contains("http://localhost:5173/reset-password?token="));
    }

    @Test
    void requestReset_doesNothing_whenUsernameDoesNotExist() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        service.requestReset("ghost", "ghost@example.com");

        verify(tokenRepository, never()).save(any());
        verify(mailService, never()).send(any(), any(), any());
    }

    @Test
    void requestReset_doesNothing_whenEmailDoesNotMatch() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));

        service.requestReset("alice", "wrong@example.com");

        verify(tokenRepository, never()).save(any());
        verify(mailService, never()).send(any(), any(), any());
    }

    @Test
    void requestReset_emailMatchIsCaseInsensitive() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));

        service.requestReset("alice", "ALICE@EXAMPLE.COM");

        verify(tokenRepository).save(any());
        verify(mailService).send(any(), any(), any());
    }

    @Test
    void requestReset_doesNothing_whenUserHasNoEmailOnFile() {
        user.setEmail(null);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));

        service.requestReset("alice", "alice@example.com");

        verify(tokenRepository, never()).save(any());
        verify(mailService, never()).send(any(), any(), any());
    }

    // ── resetPassword ─────────────────────────────────────────────────────────

    @Test
    void resetPassword_succeeds_withValidUnusedUnexpiredToken() {
        String rawToken = "tok-abc";
        PasswordResetToken stored = makeToken(rawToken, Instant.now().plus(2, ChronoUnit.MINUTES), null);
        when(tokenRepository.findByTokenHash(PasswordResetService.hashToken(rawToken))).thenReturn(Optional.of(stored));
        when(passwordEncoder.encode("new-pass")).thenReturn("$2a$10$new-hash");

        service.resetPassword(rawToken, "new-pass");

        assertEquals("$2a$10$new-hash", user.getPassword());
        verify(userRepository).save(user);

        // Token marked used
        assertNotNull(stored.getUsedAt());
        verify(tokenRepository).save(stored);
    }

    @Test
    void resetPassword_throws_whenTokenNotFound() {
        when(tokenRepository.findByTokenHash(any())).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.resetPassword("missing", "new-pass"));
        assertTrue(ex.getMessage().toLowerCase().contains("invalid"),
                "expected 'invalid' in message but got: " + ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPassword_throws_whenTokenExpired() {
        String rawToken = "tok-expired";
        PasswordResetToken stored = makeToken(rawToken, Instant.now().minusSeconds(1), null);
        when(tokenRepository.findByTokenHash(PasswordResetService.hashToken(rawToken))).thenReturn(Optional.of(stored));

        assertThrows(IllegalArgumentException.class,
                () -> service.resetPassword(rawToken, "new-pass"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPassword_throws_whenTokenAlreadyUsed() {
        String rawToken = "tok-used";
        PasswordResetToken stored = makeToken(rawToken,
                Instant.now().plus(2, ChronoUnit.MINUTES),
                Instant.now().minusSeconds(10));
        when(tokenRepository.findByTokenHash(PasswordResetService.hashToken(rawToken))).thenReturn(Optional.of(stored));

        assertThrows(IllegalArgumentException.class,
                () -> service.resetPassword(rawToken, "new-pass"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPassword_token_isSingleUse() {
        String rawToken = "tok-single";
        PasswordResetToken stored = makeToken(rawToken, Instant.now().plus(2, ChronoUnit.MINUTES), null);
        when(tokenRepository.findByTokenHash(PasswordResetService.hashToken(rawToken))).thenReturn(Optional.of(stored));
        when(passwordEncoder.encode(any())).thenReturn("$hashed");

        service.resetPassword(rawToken, "new-pass");

        // Second attempt — usedAt is now set by the first call
        assertThrows(IllegalArgumentException.class,
                () -> service.resetPassword(rawToken, "another-pass"));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private PasswordResetToken makeToken(String rawToken, Instant expiresAt, Instant usedAt) {
        PasswordResetToken t = new PasswordResetToken();
        ReflectionTestUtils.setField(t, "id", 100L);
        t.setUser(user);
        t.setTokenHash(PasswordResetService.hashToken(rawToken));
        t.setExpiresAt(expiresAt);
        t.setUsedAt(usedAt);
        return t;
    }
}
