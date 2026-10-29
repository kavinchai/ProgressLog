package com.kavin.fitness.controller;

import com.kavin.fitness.dto.LeaderboardDTO;
import com.kavin.fitness.service.LeaderboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    /**
     * Public endpoint — aggregates data only from users who opted in via Settings. A signed-in
     * viewer also gets their own standing ("me").
     */
    @GetMapping
    public ResponseEntity<LeaderboardDTO> getLeaderboard(
            @RequestParam(defaultValue = "month") String period,
            @AuthenticationPrincipal UserDetails principal) {
        String viewer = principal == null ? null : principal.getUsername();
        return ResponseEntity.ok(leaderboardService.getLeaderboard(period, viewer));
    }
}
