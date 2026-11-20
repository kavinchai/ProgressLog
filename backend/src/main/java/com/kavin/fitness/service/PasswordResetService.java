package com.kavin.fitness.service;

import com.kavin.fitness.model.PasswordResetCode;
import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.PasswordResetCodeRepository;
import com.kavin.fitness.repository.UserRepository;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Forgot password with an emailed 6-digit code. Asking for a code never reveals whether an account
 * exists, and every failed reset gets the same message.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    static final Duration CODE_LIFETIME = Duration.ofMinutes(15);
    static final int MAX_ATTEMPTS = 5;

    /** Asking again sooner than this sends nothing; the earlier code still works. */
    static final Duration RESEND_WAIT = Duration.ofSeconds(60);

    static final String INVALID = "That code is incorrect or has expired.";

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetCodeRepository codeRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Transactional
    public void requestCode(String identifier) {
        String key = identifier.trim();
        Optional<User> byUsername = userRepository.findByUsername(key);
        if (byUsername.isPresent()) {
            sendCode(byUsername.get());
            return;
        }
        List<User> byEmail = userRepository.findByEmailIgnoreCase(key);
        if (byEmail.size() == 1) {
            sendCode(byEmail.get(0));
        } else if (byEmail.size() > 1) {
            askForUsername(byEmail);
        }
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public void resetPassword(String identifier, String code, String newPassword) {
        User user =
                findAccount(identifier.trim())
                        .orElseThrow(() -> new IllegalArgumentException(INVALID));
        PasswordResetCode saved =
                codeRepository
                        .findFirstByUserIdOrderByCreatedAtDesc(user.getId())
                        .orElseThrow(() -> new IllegalArgumentException(INVALID));
        if (saved.getExpiresAt().isBefore(Instant.now()) || saved.getAttempts() >= MAX_ATTEMPTS) {
            throw new IllegalArgumentException(INVALID);
        }
        if (!passwordEncoder.matches(code, saved.getCodeHash())) {
            saved.setAttempts(saved.getAttempts() + 1);
            codeRepository.save(saved);
            throw new IllegalArgumentException(INVALID);
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordSet(true);
        userRepository.save(user);
        codeRepository.deleteByUserId(user.getId());
        log.info("Password reset with a code for user={}", user.getUsername());
    }

    private Optional<User> findAccount(String identifier) {
        Optional<User> byUsername = userRepository.findByUsername(identifier);
        if (byUsername.isPresent()) return byUsername;
        List<User> byEmail = userRepository.findByEmailIgnoreCase(identifier);
        return byEmail.size() == 1 ? Optional.of(byEmail.get(0)) : Optional.empty();
    }

    private void sendCode(User user) {
        if (user.getEmail() == null || user.getEmail().isBlank()) return;
        Optional<PasswordResetCode> last =
                codeRepository.findFirstByUserIdOrderByCreatedAtDesc(user.getId());
        if (last.isPresent()
                && last.get().getCreatedAt().isAfter(Instant.now().minus(RESEND_WAIT))) {
            return;
        }
        codeRepository.deleteByUserId(user.getId());

        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        PasswordResetCode saved = new PasswordResetCode();
        saved.setUser(user);
        saved.setCodeHash(passwordEncoder.encode(code));
        saved.setExpiresAt(Instant.now().plus(CODE_LIFETIME));
        codeRepository.save(saved);

        emailService.send(
                user.getEmail(),
                "Your Progress Logger code: " + code,
                """
                Hi %s,

                Use this code to reset your Progress Logger password:

                %s

                It expires in %d minutes. If you didn't ask for this, ignore this email and \
                your password stays the same.
                """
                        .formatted(user.getUsername(), code, CODE_LIFETIME.toMinutes()));
        log.info("Password reset code sent for user={}", user.getUsername());
    }

    private void askForUsername(List<User> users) {
        String names =
                users.stream().map(u -> "  • " + u.getUsername()).collect(Collectors.joining("\n"));
        emailService.send(
                users.get(0).getEmail(),
                "Reset your Progress Logger password",
                """
                Someone asked to reset the password for this email address, which is used by \
                more than one Progress Logger account:

                %s

                To get a code, open Progress Logger, tap "Forgot password?" and enter the \
                username instead of the email. If you didn't ask for this, ignore this email.
                """
                        .formatted(names));
    }
}
