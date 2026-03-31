package com.kavin.fitness.controller;

import com.kavin.fitness.dto.ExerciseRequest;
import com.kavin.fitness.dto.WorkoutSessionDTO;
import com.kavin.fitness.dto.WorkoutSessionRequest;
import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.UserRepository;
import com.kavin.fitness.service.WorkoutService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/workouts")
public class WorkoutController {

    @Autowired private WorkoutService workoutService;
    @Autowired private UserRepository userRepository;

    @GetMapping("/exercise-names")
    public ResponseEntity<List<String>> getExerciseNames(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(workoutService.getDistinctExerciseNames(resolveUser(principal).getId()));
    }

    @GetMapping
    public ResponseEntity<List<WorkoutSessionDTO>> getWorkouts(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(workoutService.getWorkoutSessions(resolveUser(principal).getId()));
    }

    @PostMapping
    public ResponseEntity<WorkoutSessionDTO> logWorkout(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody WorkoutSessionRequest request) {
        WorkoutSessionDTO saved = workoutService.save(resolveUser(principal), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /** Add or replace all sets for a named exercise in an existing session. */
    @PostMapping("/{sessionId}/exercises")
    public ResponseEntity<WorkoutSessionDTO> upsertExercise(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long sessionId,
            @Valid @RequestBody ExerciseRequest request) {
        WorkoutSessionDTO dto = workoutService.upsertExercise(
                sessionId, resolveUser(principal).getId(), request);
        return ResponseEntity.ok(dto);
    }

    /** Delete all sets for a named exercise in an existing session. */
    @DeleteMapping("/{sessionId}/exercises")
    public ResponseEntity<Void> deleteExercise(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long sessionId,
            @RequestParam String name) {
        workoutService.deleteExercise(sessionId, resolveUser(principal).getId(), name);
        return ResponseEntity.noContent().build();
    }

    private User resolveUser(UserDetails principal) {
        return userRepository.findByUsername(principal.getUsername())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
    }
}
