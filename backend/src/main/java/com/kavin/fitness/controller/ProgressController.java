package com.kavin.fitness.controller;

import com.kavin.fitness.dto.MilestoneDTO;
import com.kavin.fitness.dto.StrengthProgressDTO;
import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.UserRepository;
import com.kavin.fitness.service.ProgressService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/progress")
public class ProgressController {

    @Autowired
    private ProgressService progressService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/strength")
    public ResponseEntity<List<StrengthProgressDTO>> getStrengthProgress(
            @AuthenticationPrincipal UserDetails principal) {

        User user = resolveUser(principal);
        return ResponseEntity.ok(progressService.getStrengthProgress(user.getId()));
    }

    @GetMapping("/milestones")
    public ResponseEntity<List<MilestoneDTO>> getMilestones(
            @AuthenticationPrincipal UserDetails principal) {

        User user = resolveUser(principal);
        return ResponseEntity.ok(progressService.getMilestones(user.getId()));
    }

    private User resolveUser(UserDetails principal) {
        return userRepository.findByUsername(principal.getUsername())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
    }
}
