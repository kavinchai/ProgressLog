package com.kavin.fitness.controller;

import com.kavin.fitness.dto.LeaderboardDTO;
import com.kavin.fitness.service.LeaderboardService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/leaderboard")
public class LeaderboardController {

    @Autowired private LeaderboardService leaderboardService;

    /** Public endpoint — aggregates data only from users who opted in via Settings. */
    @GetMapping
    public ResponseEntity<LeaderboardDTO> getLeaderboard() {
        return ResponseEntity.ok(leaderboardService.getLeaderboard());
    }
}
