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
    @Mock MealRepository            mealRepository;

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

    // ── nutrition import ──────────────────────────────────────────────────────

    @Test
    void importData_importsDetailedMealsFromNutritionSection() {
        Map<String, Object> row1 = new LinkedHashMap<>();
        row1.put("Date", "4/1/26");
        row1.put("Day Type", "training");
        row1.put("Meal", "Breakfast");
        row1.put("Calories", "500");
        row1.put("Protein", "30");

        Map<String, Object> row2 = new LinkedHashMap<>();
        row2.put("Date", "4/1/26");
        row2.put("Day Type", "training");
        row2.put("Meal", "Lunch");
        row2.put("Calories", "700");
        row2.put("Protein", "50");

        ImportRequest req = new ImportRequest();
        req.setNutrition(List.of(row1, row2));

        when(nutritionLogRepository.findByUserIdAndLogDate(any(), any())).thenReturn(Optional.empty());
        when(nutritionLogRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        ImportResultDTO result = importService.importData(user, req);

        ArgumentCaptor<NutritionLog> captor = ArgumentCaptor.forClass(NutritionLog.class);
        verify(nutritionLogRepository).save(captor.capture());
        NutritionLog saved = captor.getValue();
        assertEquals("training", saved.getDayType());
        assertEquals(2, saved.getMeals().size());
        assertEquals("Breakfast", saved.getMeals().get(0).getMealName());
        assertEquals(500, saved.getMeals().get(0).getCalories());
        assertEquals(30, saved.getMeals().get(0).getProteinGrams());
        assertEquals("Lunch", saved.getMeals().get(1).getMealName());
        assertEquals(1, result.getNutritionImported());
    }

    @Test
    void importData_importsNutritionAcrossMultipleDates() {
        Map<String, Object> row1 = new LinkedHashMap<>();
        row1.put("Date", "4/1/26");
        row1.put("Day Type", "training");
        row1.put("Meal", "Dinner");
        row1.put("Calories", "600");
        row1.put("Protein", "45");

        Map<String, Object> row2 = new LinkedHashMap<>();
        row2.put("Date", "4/2/26");
        row2.put("Day Type", "rest");
        row2.put("Meal", "Breakfast");
        row2.put("Calories", "400");
        row2.put("Protein", "20");

        ImportRequest req = new ImportRequest();
        req.setNutrition(List.of(row1, row2));

        when(nutritionLogRepository.findByUserIdAndLogDate(any(), any())).thenReturn(Optional.empty());
        when(nutritionLogRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        ImportResultDTO result = importService.importData(user, req);

        verify(nutritionLogRepository, times(2)).save(any(NutritionLog.class));
        assertEquals(2, result.getNutritionImported());
    }

    @Test
    void importData_replacesExistingNutritionLogWhenNutritionSectionPresent() {
        NutritionLog existing = new NutritionLog();
        ReflectionTestUtils.setField(existing, "id", 99L);
        existing.setDayType("rest");

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("Date", "4/1/26");
        row.put("Day Type", "training");
        row.put("Meal", "Breakfast");
        row.put("Calories", "500");
        row.put("Protein", "30");

        ImportRequest req = new ImportRequest();
        req.setNutrition(List.of(row));

        when(nutritionLogRepository.findByUserIdAndLogDate(any(), any())).thenReturn(Optional.of(existing));
        when(nutritionLogRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(mealRepository.findByNutritionLogId(99L)).thenReturn(List.of());

        importService.importData(user, req);

        // Reuses the existing log — does NOT delete and recreate it
        verify(nutritionLogRepository, never()).delete(any());
        verify(mealRepository).findByNutritionLogId(99L);
        verify(mealRepository).deleteAll(any());
        ArgumentCaptor<NutritionLog> captor = ArgumentCaptor.forClass(NutritionLog.class);
        verify(nutritionLogRepository).save(captor.capture());
        assertEquals("training", captor.getValue().getDayType());
    }

    @Test
    void importData_doesNotCreateImportedMealFromTotalStatsWhenNutritionSectionPresent() {
        Map<String, Object> statsRow = new LinkedHashMap<>();
        statsRow.put("Date", "4/1/26");
        statsRow.put("Calories", "1200");
        statsRow.put("Protein", "80");

        Map<String, Object> nutritionRow = new LinkedHashMap<>();
        nutritionRow.put("Date", "4/1/26");
        nutritionRow.put("Day Type", "training");
        nutritionRow.put("Meal", "Lunch");
        nutritionRow.put("Calories", "600");
        nutritionRow.put("Protein", "40");

        ImportRequest req = new ImportRequest();
        req.setTotalStats(List.of(statsRow));
        req.setNutrition(List.of(nutritionRow));

        when(nutritionLogRepository.findByUserIdAndLogDate(any(), any())).thenReturn(Optional.empty());
        when(nutritionLogRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        importService.importData(user, req);

        // Only one save for the nutrition section — not a second "Imported" save from totalStats
        verify(nutritionLogRepository, times(1)).save(any(NutritionLog.class));
        ArgumentCaptor<NutritionLog> captor = ArgumentCaptor.forClass(NutritionLog.class);
        verify(nutritionLogRepository).save(captor.capture());
        assertEquals("Lunch", captor.getValue().getMeals().get(0).getMealName());
    }

    @Test
    void importData_fallsBackToImportedMealWhenNutritionSectionAbsent() {
        Map<String, Object> statsRow = new LinkedHashMap<>();
        statsRow.put("Date", "4/1/26");
        statsRow.put("Calories", "1200");
        statsRow.put("Protein", "80");

        ImportRequest req = new ImportRequest();
        req.setTotalStats(List.of(statsRow));
        // req.setNutrition intentionally left null

        when(nutritionLogRepository.findByUserIdAndLogDate(any(), any())).thenReturn(Optional.empty());
        when(nutritionLogRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        ImportResultDTO result = importService.importData(user, req);

        ArgumentCaptor<NutritionLog> captor = ArgumentCaptor.forClass(NutritionLog.class);
        verify(nutritionLogRepository).save(captor.capture());
        assertEquals("Imported", captor.getValue().getMeals().get(0).getMealName());
        assertEquals(1, result.getNutritionImported());
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
