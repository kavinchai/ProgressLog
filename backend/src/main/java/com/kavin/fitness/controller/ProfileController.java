package com.kavin.fitness.controller;

import com.kavin.fitness.dto.AppleSignInRequest;
import com.kavin.fitness.dto.CredentialsUpdateResponse;
import com.kavin.fitness.dto.DeleteAccountRequest;
import com.kavin.fitness.dto.EmailRequest;
import com.kavin.fitness.dto.EmailResponse;
import com.kavin.fitness.dto.PasswordVerifyRequest;
import com.kavin.fitness.dto.PrivacyDTO;
import com.kavin.fitness.dto.SignInMethodsResponse;
import com.kavin.fitness.dto.UpdateCredentialsRequest;
import com.kavin.fitness.dto.UserGoalsDTO;
import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.UserRepository;
import com.kavin.fitness.security.AppleIdentityVerifier;
import com.kavin.fitness.security.AppleIdentityVerifier.AppleIdentity;
import com.kavin.fitness.security.AppleTokenClient;
import com.kavin.fitness.security.CookieUtil;
import com.kavin.fitness.security.JwtFilter;
import com.kavin.fitness.security.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final CookieUtil cookieUtil;
    private final UserResolver userResolver;
    private final AppleIdentityVerifier appleIdentityVerifier;
    private final AppleTokenClient appleTokenClient;

    @GetMapping("/goals")
    public ResponseEntity<UserGoalsDTO> getGoals(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userResolver.resolve(userDetails);

        return ResponseEntity.ok(goalsOf(user));
    }

    @PutMapping("/goals")
    public ResponseEntity<UserGoalsDTO> updateGoals(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody UserGoalsDTO dto) {

        log.info(
                "PUT goals user={} calTrain={} calRest={} protein={} steps={}",
                userDetails.getUsername(),
                dto.getCalorieTargetTraining(),
                dto.getCalorieTargetRest(),
                dto.getProteinTarget(),
                dto.getStepsTarget());
        User user = userResolver.resolve(userDetails);

        user.setCalorieTargetTraining(dto.getCalorieTargetTraining());
        user.setCalorieTargetRest(dto.getCalorieTargetRest());
        user.setProteinTarget(dto.getProteinTarget());
        if (dto.getStepsTarget() != null) {
            user.setStepsTarget(dto.getStepsTarget());
        }
        userRepository.save(user);

        return ResponseEntity.ok(goalsOf(user));
    }

    private static UserGoalsDTO goalsOf(User user) {
        return new UserGoalsDTO(
                user.getCalorieTargetTraining(),
                user.getCalorieTargetRest(),
                user.getProteinTarget(),
                user.getStepsTarget());
    }

    @GetMapping("/email")
    public ResponseEntity<EmailResponse> getEmail(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userResolver.resolve(userDetails);
        return ResponseEntity.ok(new EmailResponse(user.getEmail() != null ? user.getEmail() : ""));
    }

    @PutMapping("/email")
    public ResponseEntity<EmailResponse> updateEmail(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody EmailRequest request) {

        String email = request.getEmail();
        if (email.isBlank() || !email.contains("@")) {
            log.warn("Invalid email update attempt by user={}", userDetails.getUsername());
            throw new IllegalArgumentException("Invalid email address.");
        }

        log.info("PUT email user={}", userDetails.getUsername());
        User user = userResolver.resolve(userDetails);

        user.setEmail(email.trim());
        userRepository.save(user);
        return ResponseEntity.ok(new EmailResponse(user.getEmail()));
    }

    @PostMapping("/verify-password")
    public ResponseEntity<Void> verifyPassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PasswordVerifyRequest request) {

        User user = userResolver.resolve(userDetails);

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            log.warn("Password verification failed for user={}", userDetails.getUsername());
            throw new BadCredentialsException("Incorrect password.");
        }

        log.debug("Password verified for user={}", userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    // Wrong password is a 400, not a 401: the frontend logs the user out on any 401.
    // Child rows (logs, workouts, journal) go with the user via ON DELETE CASCADE.
    @PostMapping("/delete-account")
    public ResponseEntity<Void> deleteAccount(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody DeleteAccountRequest request,
            HttpServletResponse response) {

        User user = userResolver.resolve(userDetails);

        if (user.isPasswordSet()) {
            String password = request.getPassword();
            if (password == null || !passwordEncoder.matches(password, user.getPassword())) {
                log.warn(
                        "Account deletion failed — wrong password for user={}", user.getUsername());
                throw new IllegalArgumentException("Incorrect password.");
            }
        } else {
            // Created with Apple and no password: confirm with a fresh Apple sign-in.
            if (request.getAppleIdentityToken() == null) {
                throw new IllegalArgumentException("Confirm with Apple to delete your account.");
            }
            AppleIdentity identity = appleIdentityVerifier.verify(request.getAppleIdentityToken());
            if (!identity.subject().equals(user.getAppleSub())) {
                throw new IllegalArgumentException(
                        "That Apple ID isn't connected to this account.");
            }
        }

        appleTokenClient.revoke(user.getAppleRefreshToken());
        userRepository.delete(user);
        cookieUtil.clearJwtCookie(response);
        log.info("Account deleted for user={}", user.getUsername());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/credentials")
    public ResponseEntity<CredentialsUpdateResponse> updateCredentials(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody UpdateCredentialsRequest dto,
            HttpServletRequest request,
            HttpServletResponse response) {

        log.info("PUT credentials user={}", userDetails.getUsername());
        User user = userResolver.resolve(userDetails);

        // An account created with Apple has no password to confirm until it sets one.
        if (user.isPasswordSet()
                && (dto.getCurrentPassword() == null
                        || !passwordEncoder.matches(
                                dto.getCurrentPassword(), user.getPassword()))) {
            log.warn(
                    "Credentials update failed — wrong current password for user={}",
                    userDetails.getUsername());
            throw new BadCredentialsException("Current password is incorrect.");
        }

        String newUsername = dto.getNewUsername();
        if (newUsername != null
                && !newUsername.isBlank()
                && !newUsername.equals(user.getUsername())) {
            if (userRepository.existsByUsername(newUsername)) {
                throw new IllegalArgumentException("Username already taken.");
            }
            user.setUsername(newUsername);
        }

        if (dto.getNewPassword() != null && !dto.getNewPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
            user.setPasswordSet(true);
        }

        userRepository.save(user);

        // Keep the current sign-in's expiry so "Keep me signed in" survives the change.
        Duration lifetime =
                jwtUtil.timeLeft(JwtFilter.extractToken(request)).orElse(jwtUtil.lifetime(false));
        String token = jwtUtil.generateToken(user.getUsername(), lifetime);
        cookieUtil.addJwtCookie(response, token, lifetime);
        return ResponseEntity.ok(new CredentialsUpdateResponse(user.getUsername()));
    }

    @GetMapping("/sign-in")
    public ResponseEntity<SignInMethodsResponse> getSignInMethods(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(signInMethodsOf(userResolver.resolve(userDetails)));
    }

    /** Connects an Apple ID, so Sign in with Apple opens this account. */
    @PostMapping("/apple")
    public ResponseEntity<SignInMethodsResponse> connectApple(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody AppleSignInRequest request) {
        User user = userResolver.resolve(userDetails);
        AppleIdentity identity = appleIdentityVerifier.verify(request.getIdentityToken());
        userRepository
                .findByAppleSub(identity.subject())
                .filter(owner -> !owner.getId().equals(user.getId()))
                .ifPresent(
                        owner -> {
                            throw new IllegalArgumentException(
                                    "This Apple ID is already connected to another account.");
                        });

        user.setAppleSub(identity.subject());
        appleTokenClient
                .exchangeForRefreshToken(request.getAuthorizationCode())
                .ifPresent(user::setAppleRefreshToken);
        userRepository.save(user);
        log.info("Apple ID connected for user={}", user.getUsername());
        return ResponseEntity.ok(signInMethodsOf(user));
    }

    private static SignInMethodsResponse signInMethodsOf(User user) {
        return new SignInMethodsResponse(user.getAppleSub() != null, user.isPasswordSet());
    }

    @GetMapping("/privacy")
    public ResponseEntity<PrivacyDTO> getPrivacy(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userResolver.resolve(userDetails);
        return ResponseEntity.ok(new PrivacyDTO(user.isShareData(), user.isShareCalendar()));
    }

    @PutMapping("/privacy")
    public ResponseEntity<PrivacyDTO> updatePrivacy(
            @AuthenticationPrincipal UserDetails userDetails, @Valid @RequestBody PrivacyDTO dto) {
        log.info(
                "PUT privacy user={} shareData={} shareCalendar={}",
                userDetails.getUsername(),
                dto.isShareData(),
                dto.isShareCalendar());
        User user = userResolver.resolve(userDetails);
        user.setShareData(dto.isShareData());
        user.setShareCalendar(dto.isShareCalendar());
        userRepository.save(user);
        return ResponseEntity.ok(new PrivacyDTO(user.isShareData(), user.isShareCalendar()));
    }
}
