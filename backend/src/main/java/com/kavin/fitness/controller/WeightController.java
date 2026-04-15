package com.kavin.fitness.controller;

import com.kavin.fitness.dto.WeightLogRequest;

import com.kavin.fitness.model.WeightLog;

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
    @Autowired private UserResolver userResolver;

    @GetMapping
    public ResponseEntity<List<WeightLog>> getWeightLog(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(weightService.getWeightLog(userResolver.resolve(principal).getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWeight(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long id) {
        weightService.delete(id, userResolver.resolve(principal).getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping
    public ResponseEntity<WeightLog> logWeight(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody WeightLogRequest request) {
        WeightLog saved = weightService.save(userResolver.resolve(principal), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

}
