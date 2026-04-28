package com.kavin.fitness.controller;

import com.kavin.fitness.dto.ApiKeyResponse;
import com.kavin.fitness.dto.LoginRequest;
import com.kavin.fitness.dto.LoginResponse;
import com.kavin.fitness.dto.RegisterRequest;
import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.UserRepository;
import com.kavin.fitness.security.CookieUtil;
import com.kavin.fitness.security.JwtUtil;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.util.Base64;

@Slf4j
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired private AuthenticationManager authenticationManager;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private CookieUtil cookieUtil;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request,
                                               HttpServletResponse response) {
        log.info("Login attempt for user={}", request.getUsername());
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(), request.getPassword()));

        UserDetails userDetails = (UserDetails) auth.getPrincipal();
        String token = jwtUtil.generateToken(userDetails.getUsername());

        cookieUtil.addJwtCookie(response, token);

        log.info("Login successful for user={}", userDetails.getUsername());
        return ResponseEntity.ok(new LoginResponse(userDetails.getUsername()));
    }

    @PostMapping("/register")
    public ResponseEntity<LoginResponse> register(@Valid @RequestBody RegisterRequest request,
                                                  HttpServletResponse response) {
        log.info("Registration attempt for user={}", request.getUsername());
        if (userRepository.existsByUsername(request.getUsername())) {
            log.warn("Registration failed — username already taken: {}", request.getUsername());
            throw new IllegalArgumentException("Username already taken.");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getUsername());
        cookieUtil.addJwtCookie(response, token);

        log.info("Registration successful for user={}", user.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new LoginResponse(user.getUsername()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        cookieUtil.clearJwtCookie(response);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api-key")
    public ResponseEntity<ApiKeyResponse> getApiKey(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return ResponseEntity.ok(new ApiKeyResponse(user.getApiKey()));
    }

    @PostMapping("/api-key")
    public ResponseEntity<ApiKeyResponse> generateApiKey(
            @AuthenticationPrincipal UserDetails userDetails) {
        log.info("API key generation requested by user={}", userDetails.getUsername());
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        String apiKey = "ftk_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        user.setApiKey(apiKey);
        userRepository.save(user);

        log.info("API key generated for user={}", userDetails.getUsername());
        return ResponseEntity.ok(new ApiKeyResponse(apiKey));
    }
}
