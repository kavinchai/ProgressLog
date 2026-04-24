package com.kavin.fitness.controller;

import com.kavin.fitness.dto.StepLogDTO;
import com.kavin.fitness.dto.StepLogRequest;
import com.kavin.fitness.service.StepService;
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
@RequestMapping("/api/steps")
public class StepController {

    @Autowired private StepService stepService;
    @Autowired private UserResolver userResolver;

    @GetMapping
    public ResponseEntity<List<StepLogDTO>> getStepLogs(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(stepService.getStepLogs(userResolver.resolve(principal).getId()));
    }

    @PostMapping
    public ResponseEntity<StepLogDTO> logSteps(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody StepLogRequest request) {
        log.info("POST steps user={} date={} steps={}", principal.getUsername(), request.getLogDate(), request.getSteps());
        StepLogDTO saved = stepService.save(userResolver.resolve(principal), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSteps(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long id) {
        log.info("DELETE steps id={} user={}", id, principal.getUsername());
        stepService.delete(id, userResolver.resolve(principal).getId());
        return ResponseEntity.noContent().build();
    }
}
