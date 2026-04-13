package com.kavin.fitness.controller;

import com.kavin.fitness.dto.CredentialsUpdateResponse;
import com.kavin.fitness.dto.UpdateCredentialsRequest;
import com.kavin.fitness.dto.UserGoalsDTO;
import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.UserRepository;
import com.kavin.fitness.security.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtUtil jwtUtil;

    @GetMapping("/goals")
    public ResponseEntity<UserGoalsDTO> getGoals(@AuthenticationPrincipal UserDetails userDetails) {
        User user = resolveUser(userDetails);

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

        User user = resolveUser(userDetails);

        user.setCalorieTargetTraining(dto.getCalorieTargetTraining());
        user.setCalorieTargetRest(dto.getCalorieTargetRest());
        user.setProteinTarget(dto.getProteinTarget());
        userRepository.save(user);

        return ResponseEntity.ok(dto);
    }

    @GetMapping("/email")
    public ResponseEntity<Map<String, String>> getEmail(@AuthenticationPrincipal UserDetails userDetails) {
        User user = resolveUser(userDetails);
        return ResponseEntity.ok(Map.of("email", user.getEmail() != null ? user.getEmail() : ""));
    }

    @PutMapping("/email")
    public ResponseEntity<Map<String, String>> updateEmail(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> body) {

        String email = body.get("email");
        if (email == null || email.isBlank() || !email.contains("@")) {
            throw new IllegalArgumentException("Invalid email address.");
        }

        User user = resolveUser(userDetails);

        user.setEmail(email.trim());
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("email", user.getEmail()));
    }

    @PostMapping("/verify-password")
    public ResponseEntity<Void> verifyPassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> body) {

        User user = resolveUser(userDetails);

        if (!passwordEncoder.matches(body.get("password"), user.getPassword())) {
            throw new BadCredentialsException("Incorrect password.");
        }

        return ResponseEntity.ok().build();
    }

    @PutMapping("/credentials")
    public ResponseEntity<CredentialsUpdateResponse> updateCredentials(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody UpdateCredentialsRequest dto) {

        User user = resolveUser(userDetails);

        if (!passwordEncoder.matches(dto.getCurrentPassword(), user.getPassword())) {
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

    private User resolveUser(UserDetails principal) {
        return userRepository.findByUsername(principal.getUsername())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
    }
}
