package com.kavin.fitness.controller;

import com.kavin.fitness.dto.WeightLogDTO;
import com.kavin.fitness.dto.WeightLogRequest;
import com.kavin.fitness.service.WeightService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/weight")
public class WeightController {

    @Autowired private WeightService weightService;
    @Autowired private UserResolver userResolver;

    @GetMapping
    public ResponseEntity<List<WeightLogDTO>> getWeightLog(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(weightService.getWeightLog(userResolver.resolve(principal).getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWeight(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long id) {
        log.info("DELETE weight id={} user={}", id, principal.getUsername());
        weightService.delete(id, userResolver.resolve(principal).getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping
    public ResponseEntity<WeightLogDTO> logWeight(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody WeightLogRequest request) {
        log.info("POST weight user={} date={} lbs={}", principal.getUsername(), request.getLogDate(), request.getWeightLbs());
        WeightLogDTO saved = weightService.save(userResolver.resolve(principal), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

}
