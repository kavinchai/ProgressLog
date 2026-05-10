package com.kavin.fitness.service;

import com.kavin.fitness.dto.ImportRequest;
import com.kavin.fitness.dto.ImportResultDTO;
import com.kavin.fitness.model.*;
import com.kavin.fitness.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ImportServiceTest {

    @Mock WeightLogRepository       weightLogRepository;
    @Mock WorkoutSessionRepository  workoutSessionRepository;
    @Mock NutritionLogRepository    nutritionLogRepository;
    @Mock StepLogRepository         stepLogRepository;

    @InjectMocks ImportService importService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        ReflectionTestUtils.setField(user, "id", 1L);
    }

    // ── steps import ──────────────────────────────────────────────────────────

    @Test
    void importData_importsStepsFromTotalStats() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("Date", "4/1/26");
        row.put("Steps", "8000");
        ImportRequest req = new ImportRequest();
        req.setTotalStats(List.of(row));

        when(stepLogRepository.findByUserIdAndLogDate(any(), any())).thenReturn(Optional.empty());
        when(stepLogRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        ImportResultDTO result = importService.importData(user, req);

        verify(stepLogRepository).save(argThat(log -> log.getSteps() == 8000));
        assertEquals(1, result.getStepsImported());
        assertEquals(0, result.getStepsSkipped());
    }

    @Test
    void importData_skipsRowsWithBlankSteps() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("Date", "4/1/26");
        row.put("Steps", "");
        ImportRequest req = new ImportRequest();
        req.setTotalStats(List.of(row));

        ImportResultDTO result = importService.importData(user, req);

        verify(stepLogRepository, never()).save(any());
        assertEquals(0, result.getStepsImported());
    }

    @Test
    void importData_skipsRowsWithNullSteps() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("Date", "4/1/26");
        ImportRequest req = new ImportRequest();
        req.setTotalStats(List.of(row));

        ImportResultDTO result = importService.importData(user, req);

        verify(stepLogRepository, never()).save(any());
        assertEquals(0, result.getStepsImported());
    }

    // ── cardio import ─────────────────────────────────────────────────────────

    @Test
    void importData_importsCardioSetWithDistanceAndDuration() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("Date", "4/1/26");
        row.put("Exercise", "Running");
        row.put("Set", "1");
        row.put("Distance (mi)", "3.1");
        row.put("Duration (sec)", "1800");
        ImportRequest req = new ImportRequest();
        req.setCardio(List.of(row));

        WorkoutSession savedSession = new WorkoutSession();
        when(workoutSessionRepository.findByUserIdAndSessionDate(any(), any())).thenReturn(List.of());
        when(workoutSessionRepository.save(any())).thenReturn(savedSession);

        ImportResultDTO result = importService.importData(user, req);

        assertEquals(1, result.getWorkoutsImported());
        verify(workoutSessionRepository, atLeastOnce()).save(any());
    }

    @Test
    void importData_importsTimedCardioSetWithoutDistance() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("Date", "4/2/26");
        row.put("Exercise", "Jump Rope");
        row.put("Set", "1");
        row.put("Distance (mi)", "");
        row.put("Duration (sec)", "600");
        ImportRequest req = new ImportRequest();
        req.setCardio(List.of(row));

        WorkoutSession savedSession = new WorkoutSession();
        when(workoutSessionRepository.findByUserIdAndSessionDate(any(), any())).thenReturn(List.of());
        when(workoutSessionRepository.save(any())).thenReturn(savedSession);

        ImportResultDTO result = importService.importData(user, req);

        assertEquals(1, result.getWorkoutsImported());
    }

    @Test
    void importData_combinesStrengthAndCardioSetsForSameDate() {
        Map<String, Object> strengthRow = new LinkedHashMap<>();
        strengthRow.put("Date", "4/1/26");
        strengthRow.put("Exercise", "Bench Press");
        strengthRow.put("Weight", "135");
        strengthRow.put("Set 1", "8");

        Map<String, Object> cardioRow = new LinkedHashMap<>();
        cardioRow.put("Date", "4/1/26");
        cardioRow.put("Exercise", "Running");
        cardioRow.put("Set", "1");
        cardioRow.put("Distance (mi)", "3.1");
        cardioRow.put("Duration (sec)", "1800");

        ImportRequest req = new ImportRequest();
        req.setWorkouts(List.of(strengthRow));
        req.setCardio(List.of(cardioRow));

        WorkoutSession savedSession = new WorkoutSession();
        when(workoutSessionRepository.findByUserIdAndSessionDate(any(), any())).thenReturn(List.of());
        when(workoutSessionRepository.save(any())).thenReturn(savedSession);

        ImportResultDTO result = importService.importData(user, req);

        // Both sets end up in a single session for 4/1/26
        assertEquals(1, result.getWorkoutsImported());
    }

    @Test
    void importData_handlesNullCardioSection_backwardCompat() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("Date", "4/1/26");
        row.put("Exercise", "Squat");
        row.put("Weight", "225");
        row.put("Set 1", "5");

        ImportRequest req = new ImportRequest();
        req.setWorkouts(List.of(row));
        // req.setCardio intentionally left null

        WorkoutSession savedSession = new WorkoutSession();
        when(workoutSessionRepository.findByUserIdAndSessionDate(any(), any())).thenReturn(List.of());
        when(workoutSessionRepository.save(any())).thenReturn(savedSession);

        // Should not throw
        assertDoesNotThrow(() -> importService.importData(user, req));
    }
}
