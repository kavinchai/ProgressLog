package com.kavin.fitness.service;

import com.kavin.fitness.dto.ExerciseRequest;
import com.kavin.fitness.dto.WorkoutSessionDTO;
import com.kavin.fitness.dto.WorkoutSessionRequest;
import com.kavin.fitness.model.ExerciseSet;
import com.kavin.fitness.model.User;
import com.kavin.fitness.model.WorkoutSession;
import com.kavin.fitness.repository.ExerciseSetRepository;
import com.kavin.fitness.repository.WorkoutSessionRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkoutServiceTest {

    @Mock WorkoutSessionRepository workoutSessionRepository;
    @Mock ExerciseSetRepository exerciseSetRepository;
    @InjectMocks WorkoutService workoutService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setUsername("testuser");
        // Simulate DB-assigned id via reflection
        org.springframework.test.util.ReflectionTestUtils.setField(user, "id", 1L);
    }

    // ── getWorkoutSessions ────────────────────────────────────────────────────

    @Test
    void getWorkoutSessions_returnsMappedDTOs() {
        WorkoutSession s = sessionWithId(10L, LocalDate.of(2026, 1, 1));
        when(workoutSessionRepository.findByUserIdWithSetsOrderByDateAsc(1L)).thenReturn(List.of(s));

        List<WorkoutSessionDTO> result = workoutService.getWorkoutSessions(1L, null);

        assertEquals(1, result.size());
        assertEquals(10L, result.get(0).getId());
        assertEquals(LocalDate.of(2026, 1, 1), result.get(0).getSessionDate());
    }

    @Test
    void getWorkoutSessions_emptyListWhenNoSessions() {
        when(workoutSessionRepository.findByUserIdWithSetsOrderByDateAsc(1L)).thenReturn(List.of());

        assertTrue(workoutService.getWorkoutSessions(1L, null).isEmpty());
    }

    // ── save ─────────────────────────────────────────────────────────────────

    @Test
    void save_createsSessionWithNoExercises() {
        WorkoutSessionRequest req = new WorkoutSessionRequest();
        req.setSessionDate(LocalDate.of(2026, 3, 10));

        // Return the argument itself with an id injected, so the service works on the real object
        when(workoutSessionRepository.save(any())).thenAnswer(inv -> {
            WorkoutSession s = inv.getArgument(0);
            org.springframework.test.util.ReflectionTestUtils.setField(s, "id", 5L);
            return s;
        });

        WorkoutSessionDTO dto = workoutService.save(user, req);

        assertEquals(5L, dto.getId());
        assertEquals(LocalDate.of(2026, 3, 10), dto.getSessionDate());
        assertTrue(dto.getExerciseSets().isEmpty());
    }

    @Test
    void save_createsSessionWithExercises() {
        ExerciseRequest.SetRequest sr = new ExerciseRequest.SetRequest();
        sr.setSetNumber(1);
        sr.setReps(10);
        sr.setWeightLbs(BigDecimal.valueOf(100));

        ExerciseRequest ex = new ExerciseRequest();
        ex.setExerciseName("Squat");
        ex.setSets(List.of(sr));

        WorkoutSessionRequest req = new WorkoutSessionRequest();
        req.setSessionDate(LocalDate.of(2026, 3, 10));
        req.setExercises(List.of(ex));

        when(workoutSessionRepository.save(any())).thenAnswer(inv -> {
            WorkoutSession s = inv.getArgument(0);
            org.springframework.test.util.ReflectionTestUtils.setField(s, "id", 6L);
            return s;
        });

        WorkoutSessionDTO dto = workoutService.save(user, req);

        assertEquals(1, dto.getExerciseSets().size());
        assertEquals("Squat", dto.getExerciseSets().get(0).getExerciseName());
    }

    // ── upsertExercise ────────────────────────────────────────────────────────

    @Test
    void upsertExercise_replacesExistingExerciseSets() {
        WorkoutSession session = sessionWithId(7L, LocalDate.of(2026, 3, 1));
        ExerciseSet oldSet = new ExerciseSet();
        oldSet.setExerciseName("Bench Press");
        oldSet.setSetNumber(1);
        session.getExerciseSets().add(oldSet);

        when(workoutSessionRepository.findById(7L)).thenReturn(Optional.of(session));
        when(workoutSessionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ExerciseRequest.SetRequest sr = new ExerciseRequest.SetRequest();
        sr.setSetNumber(1);
        sr.setReps(8);
        sr.setWeightLbs(BigDecimal.valueOf(135));

        ExerciseRequest req = new ExerciseRequest();
        req.setExerciseName("Bench Press");
        req.setSets(List.of(sr));

        WorkoutSessionDTO dto = workoutService.upsertExercise(7L, 1L, req);

        // old set removed, new set added
        assertEquals(1, dto.getExerciseSets().size());
        assertEquals(8, dto.getExerciseSets().get(0).getReps());
    }

    // ── deleteExercise ────────────────────────────────────────────────────────

    @Test
    void deleteExercise_removesAllSetsForExercise() {
        WorkoutSession session = sessionWithId(8L, LocalDate.of(2026, 3, 1));
        ExerciseSet es1 = new ExerciseSet();
        es1.setExerciseName("Deadlift");
        ExerciseSet es2 = new ExerciseSet();
        es2.setExerciseName("Squat");
        session.getExerciseSets().addAll(List.of(es1, es2));

        when(workoutSessionRepository.findById(8L)).thenReturn(Optional.of(session));
        when(workoutSessionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        workoutService.deleteExercise(8L, 1L, "Deadlift");

        // Only "Squat" remains
        assertEquals(1, session.getExerciseSets().size());
        assertEquals("Squat", session.getExerciseSets().get(0).getExerciseName());
    }

    // ── resolveSession (error cases) ──────────────────────────────────────────

    @Test
    void upsertExercise_throwsWhenSessionNotFound() {
        when(workoutSessionRepository.findById(99L)).thenReturn(Optional.empty());

        ExerciseRequest req = new ExerciseRequest();
        req.setExerciseName("X");
        req.setSets(List.of());

        assertThrows(EntityNotFoundException.class,
                () -> workoutService.upsertExercise(99L, 1L, req));
    }

    @Test
    void upsertExercise_throwsWhenSessionBelongsToAnotherUser() {
        WorkoutSession session = sessionWithId(7L, LocalDate.of(2026, 3, 1));
        when(workoutSessionRepository.findById(7L)).thenReturn(Optional.of(session));

        ExerciseRequest req = new ExerciseRequest();
        req.setExerciseName("X");
        req.setSets(List.of());

        // user id 999 does not own this session (owner id is 1)
        assertThrows(EntityNotFoundException.class,
                () -> workoutService.upsertExercise(7L, 999L, req));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private WorkoutSession sessionWithId(Long id, LocalDate date) {
        WorkoutSession s = new WorkoutSession();
        s.setUser(user);
        s.setSessionDate(date);
        org.springframework.test.util.ReflectionTestUtils.setField(s, "id", id);
        s.setExerciseSets(new ArrayList<>());
        return s;
    }
}
