package com.kavin.fitness.controller;

import com.kavin.fitness.dto.WeightLogRequest;
import com.kavin.fitness.model.User;
import com.kavin.fitness.model.WeightLog;
import com.kavin.fitness.repository.UserRepository;
import com.kavin.fitness.service.WeightService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/weight")
public class WeightController {

    @Autowired private WeightService weightService;
    @Autowired private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<WeightLog>> getWeightLog(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(weightService.getWeightLog(resolveUser(principal).getId()));
    }

    @PostMapping
    public ResponseEntity<WeightLog> logWeight(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody WeightLogRequest request) {
        WeightLog saved = weightService.save(resolveUser(principal), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    private User resolveUser(UserDetails principal) {
        return userRepository.findByUsername(principal.getUsername())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
    }
}
