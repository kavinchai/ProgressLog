package com.kavin.fitness.controller;

import com.kavin.fitness.dto.CredentialsUpdateResponse;
import com.kavin.fitness.dto.EmailRequest;
import com.kavin.fitness.dto.EmailResponse;
import com.kavin.fitness.dto.PasswordVerifyRequest;
import com.kavin.fitness.dto.UpdateCredentialsRequest;
import com.kavin.fitness.dto.UserGoalsDTO;
import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.UserRepository;
import com.kavin.fitness.security.JwtUtil;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    @Autowired private UserRepository  userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtUtil         jwtUtil;
    @Autowired private UserResolver    userResolver;

    @GetMapping("/goals")
    public ResponseEntity<UserGoalsDTO> getGoals(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userResolver.resolve(userDetails);

        return ResponseEntity.ok(new UserGoalsDTO(
                user.getCalorieTargetTraining(),
                user.getCalorieTargetRest(),
                user.getProteinTarget()
        ));
    }

    @PutMapping("/goals")
    public ResponseEntity<UserGoalsDTO> updateGoals(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody UserGoalsDTO dto) {

        log.info("PUT goals user={} calTrain={} calRest={} protein={}", userDetails.getUsername(), dto.getCalorieTargetTraining(), dto.getCalorieTargetRest(), dto.getProteinTarget());
        User user = userResolver.resolve(userDetails);

        user.setCalorieTargetTraining(dto.getCalorieTargetTraining());
        user.setCalorieTargetRest(dto.getCalorieTargetRest());
        user.setProteinTarget(dto.getProteinTarget());
        userRepository.save(user);

        return ResponseEntity.ok(dto);
    }

    @GetMapping("/email")
    public ResponseEntity<EmailResponse> getEmail(@AuthenticationPrincipal UserDetails userDetails) {
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

    @PutMapping("/credentials")
    public ResponseEntity<CredentialsUpdateResponse> updateCredentials(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody UpdateCredentialsRequest dto) {

        log.info("PUT credentials user={}", userDetails.getUsername());
        User user = userResolver.resolve(userDetails);

        if (!passwordEncoder.matches(dto.getCurrentPassword(), user.getPassword())) {
            log.warn("Credentials update failed — wrong current password for user={}", userDetails.getUsername());
            throw new BadCredentialsException("Current password is incorrect.");
        }

        String newUsername = dto.getNewUsername();
        if (newUsername != null && !newUsername.isBlank() && !newUsername.equals(user.getUsername())) {
            if (userRepository.existsByUsername(newUsername)) {
                throw new IllegalArgumentException("Username already taken.");
            }
            user.setUsername(newUsername);
        }

        if (dto.getNewPassword() != null && !dto.getNewPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        }

        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getUsername());
        return ResponseEntity.ok(new CredentialsUpdateResponse(token, user.getUsername()));
    }

}
