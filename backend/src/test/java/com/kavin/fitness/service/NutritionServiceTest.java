package com.kavin.fitness.service;

import com.kavin.fitness.dto.MealRequest;
import com.kavin.fitness.dto.NutritionLogDTO;
import com.kavin.fitness.dto.NutritionLogRequest;
import com.kavin.fitness.model.Meal;
import com.kavin.fitness.model.NutritionLog;
import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.MealRepository;
import com.kavin.fitness.repository.NutritionLogRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NutritionServiceTest {

    @Mock NutritionLogRepository nutritionLogRepository;
    @Mock MealRepository mealRepository;
    @InjectMocks NutritionService nutritionService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setUsername("testuser");
        ReflectionTestUtils.setField(user, "id", 1L);
    }

    // ── getNutritionLog ──────────────────────────────────────────────────────

    @Test
    void getNutritionLog_returnsEmptyListWhenNoLogs() {
        when(nutritionLogRepository.findByUserIdWithMealsOrderByLogDateAsc(1L)).thenReturn(List.of());

        assertTrue(nutritionService.getNutritionLog(1L).isEmpty());
    }

    @Test
    void getNutritionLog_mapsMealsToDTO() {
        NutritionLog log = nutritionLog(10L, LocalDate.of(2026, 3, 1), "training");
        Meal meal = meal(20L, log, "Chicken", 500, 40);
        log.getMeals().add(meal);

        when(nutritionLogRepository.findByUserIdWithMealsOrderByLogDateAsc(1L)).thenReturn(List.of(log));

        List<NutritionLogDTO> result = nutritionService.getNutritionLog(1L);

        assertEquals(1, result.size());
        NutritionLogDTO dto = result.get(0);
        assertEquals(10L, dto.getId());
        assertEquals("training", dto.getDayType());
        assertEquals(500, dto.getTotalCalories());
        assertEquals(40, dto.getTotalProtein());
        assertEquals(1, dto.getMeals().size());
        assertEquals("Chicken", dto.getMeals().get(0).getMealName());
    }

    @Test
    void getNutritionLog_sumsMealCaloriesAndProtein() {
        NutritionLog log = nutritionLog(10L, LocalDate.of(2026, 3, 1), "training");
        log.getMeals().add(meal(1L, log, "Breakfast", 600, 30));
        log.getMeals().add(meal(2L, log, "Lunch", 800, 50));

        when(nutritionLogRepository.findByUserIdWithMealsOrderByLogDateAsc(1L)).thenReturn(List.of(log));

        NutritionLogDTO dto = nutritionService.getNutritionLog(1L).get(0);
        assertEquals(1400, dto.getTotalCalories());
        assertEquals(80, dto.getTotalProtein());
    }

    // ── upsertLog ────────────────────────────────────────────────────────────

    @Test
    void upsertLog_createsNewLogWhenNoneExists() {
        NutritionLogRequest request = new NutritionLogRequest();
        request.setLogDate(LocalDate.of(2026, 3, 10));
        request.setDayType("training");

        when(nutritionLogRepository.findByUserIdAndLogDate(1L, LocalDate.of(2026, 3, 10)))
                .thenReturn(Optional.empty());
        when(nutritionLogRepository.save(any())).thenAnswer(inv -> {
            NutritionLog log = inv.getArgument(0);
            ReflectionTestUtils.setField(log, "id", 5L);
            return log;
        });

        NutritionLogDTO dto = nutritionService.upsertLog(user, request);

        assertEquals(5L, dto.getId());
        assertEquals("training", dto.getDayType());
    }

    @Test
    void upsertLog_updatesExistingLog() {
        NutritionLog existing = nutritionLog(10L, LocalDate.of(2026, 3, 10), "rest");

        NutritionLogRequest request = new NutritionLogRequest();
        request.setLogDate(LocalDate.of(2026, 3, 10));
        request.setDayType("training");

        when(nutritionLogRepository.findByUserIdAndLogDate(1L, LocalDate.of(2026, 3, 10)))
                .thenReturn(Optional.of(existing));
        when(nutritionLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        NutritionLogDTO dto = nutritionService.upsertLog(user, request);

        assertEquals(10L, dto.getId());
        assertEquals("training", dto.getDayType());
    }

    // ── addMeal ──────────────────────────────────────────────────────────────

    @Test
    void addMeal_addsMealToExistingLog() {
        NutritionLog log = nutritionLog(10L, LocalDate.of(2026, 3, 1), "training");
        when(nutritionLogRepository.findById(10L)).thenReturn(Optional.of(log));
        when(nutritionLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        MealRequest request = new MealRequest();
        request.setMealName("Steak");
        request.setCalories(700);
        request.setProteinGrams(55);

        NutritionLogDTO dto = nutritionService.addMeal(10L, 1L, request);

        assertEquals(1, dto.getMeals().size());
        assertEquals("Steak", dto.getMeals().get(0).getMealName());
        assertEquals(700, dto.getTotalCalories());
        assertEquals(55, dto.getTotalProtein());
    }

    @Test
    void addMeal_throwsWhenLogNotFound() {
        when(nutritionLogRepository.findById(99L)).thenReturn(Optional.empty());

        MealRequest request = new MealRequest();
        request.setCalories(500);
        request.setProteinGrams(30);

        assertThrows(EntityNotFoundException.class,
                () -> nutritionService.addMeal(99L, 1L, request));
    }

    @Test
    void addMeal_throwsWhenLogBelongsToAnotherUser() {
        NutritionLog log = nutritionLog(10L, LocalDate.of(2026, 3, 1), "training");
        when(nutritionLogRepository.findById(10L)).thenReturn(Optional.of(log));

        MealRequest request = new MealRequest();
        request.setCalories(500);
        request.setProteinGrams(30);

        assertThrows(EntityNotFoundException.class,
                () -> nutritionService.addMeal(10L, 999L, request));
    }

    // ── deleteLog ────────────────────────────────────────────────────────────

    @Test
    void deleteLog_removesLogOwnedByUser() {
        NutritionLog log = nutritionLog(10L, LocalDate.of(2026, 3, 1), "training");
        when(nutritionLogRepository.findById(10L)).thenReturn(Optional.of(log));

        nutritionService.deleteLog(10L, 1L);

        verify(nutritionLogRepository).delete(log);
    }

    @Test
    void deleteLog_throwsWhenLogNotFound() {
        when(nutritionLogRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class,
                () -> nutritionService.deleteLog(99L, 1L));
    }

    // ── deleteMeal ───────────────────────────────────────────────────────────

    @Test
    void deleteMeal_removesMealFromLog() {
        NutritionLog log = nutritionLog(10L, LocalDate.of(2026, 3, 1), "training");
        Meal m = meal(20L, log, "Chicken", 500, 40);

        when(nutritionLogRepository.findById(10L)).thenReturn(Optional.of(log));
        when(mealRepository.findById(20L)).thenReturn(Optional.of(m));

        nutritionService.deleteMeal(10L, 20L, 1L);

        verify(mealRepository).delete(m);
    }

    @Test
    void deleteMeal_throwsWhenMealNotFound() {
        NutritionLog log = nutritionLog(10L, LocalDate.of(2026, 3, 1), "training");
        when(nutritionLogRepository.findById(10L)).thenReturn(Optional.of(log));
        when(mealRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class,
                () -> nutritionService.deleteMeal(10L, 99L, 1L));
    }

    @Test
    void deleteMeal_throwsWhenMealBelongsToDifferentLog() {
        NutritionLog log10 = nutritionLog(10L, LocalDate.of(2026, 3, 1), "training");
        NutritionLog log20 = nutritionLog(20L, LocalDate.of(2026, 3, 2), "rest");
        Meal m = meal(30L, log20, "Chicken", 500, 40);

        when(nutritionLogRepository.findById(10L)).thenReturn(Optional.of(log10));
        when(mealRepository.findById(30L)).thenReturn(Optional.of(m));

        assertThrows(EntityNotFoundException.class,
                () -> nutritionService.deleteMeal(10L, 30L, 1L));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private NutritionLog nutritionLog(Long id, LocalDate date, String dayType) {
        NutritionLog log = new NutritionLog();
        ReflectionTestUtils.setField(log, "id", id);
        log.setUser(user);
        log.setLogDate(date);
        log.setDayType(dayType);
        log.setMeals(new ArrayList<>());
        return log;
    }

    private Meal meal(Long id, NutritionLog log, String name, int cal, int protein) {
        Meal m = new Meal();
        ReflectionTestUtils.setField(m, "id", id);
        m.setNutritionLog(log);
        m.setMealName(name);
        m.setCalories(cal);
        m.setProteinGrams(protein);
        return m;
    }
}
