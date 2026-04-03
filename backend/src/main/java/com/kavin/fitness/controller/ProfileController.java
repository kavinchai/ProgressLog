package com.kavin.fitness.controller;

import com.kavin.fitness.dto.CredentialsUpdateResponse;
import com.kavin.fitness.dto.UpdateCredentialsRequest;
import com.kavin.fitness.dto.UserGoalsDTO;
import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.UserRepository;
import com.kavin.fitness.security.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

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

        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setCalorieTargetTraining(dto.getCalorieTargetTraining());
        user.setCalorieTargetRest(dto.getCalorieTargetRest());
        user.setProteinTarget(dto.getProteinTarget());
        userRepository.save(user);

        return ResponseEntity.ok(dto);
    }

    @PostMapping("/verify-password")
    public ResponseEntity<?> verifyPassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> body) {

        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(body.get("password"), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Incorrect password."));
        }

        return ResponseEntity.ok().build();
    }

    @PutMapping("/credentials")
    public ResponseEntity<?> updateCredentials(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody UpdateCredentialsRequest dto) {

        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(dto.getCurrentPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Current password is incorrect."));
        }

        String newUsername = dto.getNewUsername();
        if (newUsername != null && !newUsername.isBlank() && !newUsername.equals(user.getUsername())) {
            if (userRepository.existsByUsername(newUsername)) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("message", "Username already taken."));
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
