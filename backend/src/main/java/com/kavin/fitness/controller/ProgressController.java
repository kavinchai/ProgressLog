package com.kavin.fitness.controller;

import com.kavin.fitness.dto.CardioProgressDTO;
import com.kavin.fitness.dto.MilestoneDTO;
import com.kavin.fitness.dto.PREntryDTO;
import com.kavin.fitness.dto.StrengthProgressDTO;
import com.kavin.fitness.service.ProgressService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/progress")
public class ProgressController {

    @Autowired private ProgressService progressService;
    @Autowired private UserResolver    userResolver;

    @GetMapping("/strength")
    public ResponseEntity<List<StrengthProgressDTO>> getStrengthProgress(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(progressService.getStrengthProgress(userResolver.resolve(principal).getId()));
    }

    @GetMapping("/prs")
    public ResponseEntity<List<PREntryDTO>> getPRs(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(progressService.getPRs(userResolver.resolve(principal).getId()));
    }

    @GetMapping("/cardio")
    public ResponseEntity<List<CardioProgressDTO>> getCardioProgress(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(progressService.getCardioProgress(userResolver.resolve(principal).getId()));
    }

    @GetMapping("/milestones")
    public ResponseEntity<List<MilestoneDTO>> getMilestones(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(progressService.getMilestones(userResolver.resolve(principal).getId()));
    }
}
