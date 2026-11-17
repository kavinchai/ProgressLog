package com.kavin.fitness.controller;

import com.kavin.fitness.dto.AppleRegisterRequest;
import com.kavin.fitness.dto.AppleSignInRequest;
import com.kavin.fitness.dto.AppleSignInResponse;
import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.UserRepository;
import com.kavin.fitness.security.AppleIdentityVerifier;
import com.kavin.fitness.security.AppleIdentityVerifier.AppleIdentity;
import com.kavin.fitness.security.AppleTokenClient;
import com.kavin.fitness.security.CookieUtil;
import com.kavin.fitness.security.JwtUtil;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Sign in with Apple from the iPhone app. */
@Slf4j
@RestController
@RequestMapping("/api/auth/apple")
@RequiredArgsConstructor
public class AppleAuthController {

    private final AppleIdentityVerifier appleIdentityVerifier;
    private final AppleTokenClient appleTokenClient;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final CookieUtil cookieUtil;

    /** Signs in an Apple ID with an account, or asks the app to pick a username for a new one. */
    @PostMapping
    public ResponseEntity<AppleSignInResponse> signIn(
            @RequestBody AppleSignInRequest request, HttpServletResponse response) {
        AppleIdentity identity = appleIdentityVerifier.verify(request.getIdentityToken());
        Optional<User> found = userRepository.findByAppleSub(identity.subject());
        if (found.isEmpty()) {
            log.info("Apple sign-in for a new Apple ID; asking for a username");
            return ResponseEntity.ok(new AppleSignInResponse(null, true));
        }

        User user = found.get();
        keepRefreshToken(user, request.getAuthorizationCode());
        signInCookie(response, user, request.isRememberMe());
        log.info("Apple sign-in successful for user={}", user.getUsername());
        return ResponseEntity.ok(new AppleSignInResponse(user.getUsername(), false));
    }

    /** Creates the account for a new Apple ID, with the username the person picked. */
    @PostMapping("/register")
    public ResponseEntity<AppleSignInResponse> register(
            @Valid @RequestBody AppleRegisterRequest request, HttpServletResponse response) {
        AppleIdentity identity = appleIdentityVerifier.verify(request.getIdentityToken());
        if (userRepository.findByAppleSub(identity.subject()).isPresent()) {
            throw new IllegalArgumentException(
                    "This Apple ID already has an account. Sign in with Apple instead.");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already taken.");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        // No password yet: store a random one nobody knows, so password sign-in can't work.
        user.setPassword(passwordEncoder.encode(randomSecret()));
        user.setPasswordSet(false);
        user.setEmail(identity.email());
        user.setAppleSub(identity.subject());
        appleTokenClient
                .exchangeForRefreshToken(request.getAuthorizationCode())
                .ifPresent(user::setAppleRefreshToken);
        userRepository.save(user);

        signInCookie(response, user, request.isRememberMe());
        log.info("Apple registration successful for user={}", user.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new AppleSignInResponse(user.getUsername(), false));
    }

    private void keepRefreshToken(User user, String authorizationCode) {
        appleTokenClient
                .exchangeForRefreshToken(authorizationCode)
                .ifPresent(
                        token -> {
                            user.setAppleRefreshToken(token);
                            userRepository.save(user);
                        });
    }

    private void signInCookie(HttpServletResponse response, User user, boolean rememberMe) {
        Duration lifetime = jwtUtil.lifetime(rememberMe);
        cookieUtil.addJwtCookie(
                response, jwtUtil.generateToken(user.getUsername(), lifetime), lifetime);
    }

    private static String randomSecret() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
