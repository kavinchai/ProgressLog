package com.kavin.fitness.service;

import com.kavin.fitness.dto.MealRequest;
import com.kavin.fitness.dto.NutritionLogDTO;
import com.kavin.fitness.dto.NutritionLogRequest;
import com.kavin.fitness.model.Meal;
import com.kavin.fitness.model.NutritionLog;
import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.MealRepository;
import com.kavin.fitness.repository.NutritionLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class NutritionService {

    @Autowired private NutritionLogRepository nutritionLogRepository;
    @Autowired private MealRepository         mealRepository;

    @Transactional(readOnly = true)
    public List<NutritionLogDTO> getNutritionLog(Long userId) {
        return nutritionLogRepository
                .findByUserIdWithMealsOrderByLogDateAsc(userId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    /** Create or update the day log (dayType + steps). */
    @Transactional
    public NutritionLogDTO upsertLog(User user, NutritionLogRequest request) {
        NutritionLog log = nutritionLogRepository
                .findByUserIdAndLogDate(user.getId(), request.getLogDate())
                .orElseGet(NutritionLog::new);
        log.setUser(user);
        log.setLogDate(request.getLogDate());
        log.setDayType(request.getDayType());
        log.setSteps(request.getSteps());
        return toDTO(nutritionLogRepository.save(log));
    }

    /** Add a meal to an existing day log. */
    @Transactional
    public NutritionLogDTO addMeal(Long logId, Long userId, MealRequest request) {
        NutritionLog log = resolveLog(logId, userId);
        Meal meal = new Meal();
        meal.setNutritionLog(log);
        meal.setMealName(request.getMealName());
        meal.setCalories(request.getCalories());
        meal.setProteinGrams(request.getProteinGrams());
        log.getMeals().add(meal);
        return toDTO(nutritionLogRepository.save(log));
    }

    /** Update an existing meal. */
    @Transactional
    public NutritionLogDTO updateMeal(Long logId, Long mealId, Long userId, MealRequest request) {
        NutritionLog log = resolveLog(logId, userId);
        Meal meal = mealRepository.findById(mealId)
                .filter(existingMeal -> existingMeal.getNutritionLog().getId().equals(logId))
                .orElseThrow(() -> new IllegalArgumentException("Meal not found"));
        meal.setMealName(request.getMealName());
        meal.setCalories(request.getCalories());
        meal.setProteinGrams(request.getProteinGrams());
        mealRepository.save(meal);
        // reload with fresh meals
        return toDTO(nutritionLogRepository.findByUserIdWithMealsOrderByLogDateAsc(userId)
                .stream().filter(nutritionLog -> nutritionLog.getId().equals(logId)).findFirst()
                .orElse(log));
    }

    /** Delete a meal. */
    @Transactional
    public void deleteMeal(Long logId, Long mealId, Long userId) {
        resolveLog(logId, userId);
        Meal meal = mealRepository.findById(mealId)
                .filter(existingMeal -> existingMeal.getNutritionLog().getId().equals(logId))
                .orElseThrow(() -> new IllegalArgumentException("Meal not found"));
        mealRepository.delete(meal);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private NutritionLog resolveLog(Long logId, Long userId) {
        return nutritionLogRepository.findById(logId)
                .filter(nutritionLog -> nutritionLog.getUser().getId().equals(userId))
                .orElseThrow(() -> new IllegalArgumentException("Nutrition log not found"));
    }

    private NutritionLogDTO toDTO(NutritionLog log) {
        List<NutritionLogDTO.MealDTO> mealDTOs = log.getMeals().stream()
                .map(meal -> new NutritionLogDTO.MealDTO(
                        meal.getId(), meal.getMealName(), meal.getCalories(), meal.getProteinGrams()))
                .collect(Collectors.toList());

        int totalCalories = log.getMeals().stream().mapToInt(Meal::getCalories).sum();
        int totalProtein  = log.getMeals().stream().mapToInt(Meal::getProteinGrams).sum();

        // fallback to legacy columns if no meals yet
        if (mealDTOs.isEmpty()) {
            totalCalories = log.getCalories()    != null ? log.getCalories()    : 0;
            totalProtein  = log.getProteinGrams() != null ? log.getProteinGrams() : 0;
        }

        return new NutritionLogDTO(
                log.getId(), log.getLogDate(), log.getDayType(),
                log.getSteps(), totalCalories, totalProtein, mealDTOs);
    }
}
