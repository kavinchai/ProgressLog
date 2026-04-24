package com.kavin.fitness.controller;

import com.kavin.fitness.dto.ExerciseRequest;
import com.kavin.fitness.dto.RenameSessionRequest;
import com.kavin.fitness.dto.WorkoutSessionDTO;
import com.kavin.fitness.dto.WorkoutSessionRequest;
import com.kavin.fitness.service.WorkoutService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;


@Slf4j
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
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam(required = false) LocalDate date) {
        long userId = userResolver.resolve(principal).getId();
        log.debug("GET workouts userId={} date={}", userId, date);
        return ResponseEntity.ok(workoutService.getWorkoutSessions(userId, date));
    }

    @GetMapping("/{sessionId}")
    public ResponseEntity<WorkoutSessionDTO> getWorkout(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long sessionId) {
        return ResponseEntity.ok(workoutService.getWorkoutSession(sessionId, userResolver.resolve(principal).getId()));
    }

    @PostMapping
    public ResponseEntity<WorkoutSessionDTO> logWorkout(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody WorkoutSessionRequest request) {
        log.info("POST workout user={} date={} exercises={}", principal.getUsername(), request.getSessionDate(), request.getExercises() != null ? request.getExercises().size() : 0);
        WorkoutSessionDTO saved = workoutService.save(userResolver.resolve(principal), request);
        log.info("Workout saved sessionId={}", saved.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /** Rename an existing workout session. */
    @PatchMapping("/{sessionId}/name")
    public ResponseEntity<WorkoutSessionDTO> renameSession(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long sessionId,
            @RequestBody RenameSessionRequest body) {
        log.info("PATCH rename sessionId={} newName={}", sessionId, body.getSessionName());
        WorkoutSessionDTO dto = workoutService.renameSession(
                sessionId, userResolver.resolve(principal).getId(), body.getSessionName());
        return ResponseEntity.ok(dto);
    }

    /** Delete an entire workout session. */
    @DeleteMapping("/{sessionId}")
    public ResponseEntity<Void> deleteSession(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long sessionId) {
        log.info("DELETE workout sessionId={} user={}", sessionId, principal.getUsername());
        workoutService.deleteSession(sessionId, userResolver.resolve(principal).getId());
        return ResponseEntity.noContent().build();
    }

    /** Add or replace all sets for a named exercise in an existing session. */
    @PostMapping("/{sessionId}/exercises")
    public ResponseEntity<WorkoutSessionDTO> upsertExercise(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long sessionId,
            @Valid @RequestBody ExerciseRequest request) {
        log.info("POST upsert exercise sessionId={} exercise={}", sessionId, request.getExerciseName());
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
        log.info("PUT update sessionId={} user={}", sessionId, principal.getUsername());
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
        log.info("DELETE exercise sessionId={} exercise={}", sessionId, name);
        workoutService.deleteExercise(sessionId, userResolver.resolve(principal).getId(), name);
        return ResponseEntity.noContent().build();
    }

}
