package com.kavin.fitness.controller;

import com.kavin.fitness.dto.UserGoalsDTO;
import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    @Autowired private UserRepository userRepository;

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
}
