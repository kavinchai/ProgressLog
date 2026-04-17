package com.kavin.fitness.controller;

import com.kavin.fitness.dto.ExerciseRequest;
import com.kavin.fitness.dto.WorkoutSessionDTO;
import com.kavin.fitness.dto.WorkoutSessionRequest;
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
    @Autowired private UserResolver userResolver;

    @GetMapping("/exercise-names")
    public ResponseEntity<List<String>> getExerciseNames(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(workoutService.getDistinctExerciseNames(userResolver.resolve(principal).getId()));
    }

    @GetMapping
    public ResponseEntity<List<WorkoutSessionDTO>> getWorkouts(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(workoutService.getWorkoutSessions(userResolver.resolve(principal).getId()));
    }

    @PostMapping
    public ResponseEntity<WorkoutSessionDTO> logWorkout(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody WorkoutSessionRequest request) {
        WorkoutSessionDTO saved = workoutService.save(userResolver.resolve(principal), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /** Rename an existing workout session. */
    @PatchMapping("/{sessionId}/name")
    public ResponseEntity<WorkoutSessionDTO> renameSession(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long sessionId,
            @RequestBody java.util.Map<String, String> body) {
        WorkoutSessionDTO dto = workoutService.renameSession(
                sessionId, userResolver.resolve(principal).getId(), body.get("sessionName"));
        return ResponseEntity.ok(dto);
    }

    /** Delete an entire workout session. */
    @DeleteMapping("/{sessionId}")
    public ResponseEntity<Void> deleteSession(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long sessionId) {
        workoutService.deleteSession(sessionId, userResolver.resolve(principal).getId());
        return ResponseEntity.noContent().build();
    }

    /** Add or replace all sets for a named exercise in an existing session. */
    @PostMapping("/{sessionId}/exercises")
    public ResponseEntity<WorkoutSessionDTO> upsertExercise(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long sessionId,
            @Valid @RequestBody ExerciseRequest request) {
        WorkoutSessionDTO dto = workoutService.upsertExercise(
                sessionId, userResolver.resolve(principal).getId(), request);
        return ResponseEntity.ok(dto);
    }

    /** Replace the entire workout session (name + all exercises). */
    @PutMapping("/{sessionId}")
    public ResponseEntity<WorkoutSessionDTO> updateSession(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long sessionId,
            @Valid @RequestBody WorkoutSessionRequest request) {
        WorkoutSessionDTO dto = workoutService.updateSession(
                sessionId, userResolver.resolve(principal).getId(), request);
        return ResponseEntity.ok(dto);
    }

    /** Delete all sets for a named exercise in an existing session. */
    @DeleteMapping("/{sessionId}/exercises")
    public ResponseEntity<Void> deleteExercise(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long sessionId,
            @RequestParam String name) {
        workoutService.deleteExercise(sessionId, userResolver.resolve(principal).getId(), name);
        return ResponseEntity.noContent().build();
    }

}
