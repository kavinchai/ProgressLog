package com.kavin.fitness.service;

import com.kavin.fitness.dto.ImportRequest;
import com.kavin.fitness.dto.ImportResultDTO;
import com.kavin.fitness.model.ExerciseSet;
import com.kavin.fitness.model.Meal;
import com.kavin.fitness.model.NutritionLog;
import com.kavin.fitness.model.StepLog;
import com.kavin.fitness.model.User;
import com.kavin.fitness.model.WeightLog;
import com.kavin.fitness.model.WorkoutSession;
import com.kavin.fitness.repository.MealRepository;
import com.kavin.fitness.repository.NutritionLogRepository;
import com.kavin.fitness.repository.StepLogRepository;
import com.kavin.fitness.repository.WeightLogRepository;
import com.kavin.fitness.repository.WorkoutSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
public class ImportService {

    @Autowired private WeightLogRepository       weightLogRepository;
    @Autowired private WorkoutSessionRepository  workoutSessionRepository;
    @Autowired private NutritionLogRepository    nutritionLogRepository;
    @Autowired private StepLogRepository         stepLogRepository;
    @Autowired private MealRepository            mealRepository;

    @Transactional
    public ImportResultDTO importData(User user, ImportRequest request) {
        int weightImported = 0, weightSkipped = 0;
        int nutritionImported = 0, nutritionSkipped = 0;
        int workoutsImported = 0, workoutsSkipped = 0;
        int stepsImported = 0, stepsSkipped = 0;

        // Determine whether to use the detailed nutrition section (new format) or fall back to
        // totalStats aggregates (old format). When a nutrition section is present, skip the
        // Calories/Protein columns in totalStats to avoid creating duplicate "Imported" meals.
        boolean hasDetailedNutrition = request.getNutrition() != null && !request.getNutrition().isEmpty();

        // ── Weight + Steps (+ legacy nutrition from totalStats) ────────────────
        if (request.getTotalStats() != null) {
            for (Map<String, Object> row : request.getTotalStats()) {
                String dateStr = getString(row, "Date");
                if (dateStr == null) continue;
                LocalDate date = parseDate(dateStr);
                if (date == null) continue;

                // Weight
                String weightStr = getString(row, "Weight");
                if (weightStr != null) {
                    WeightLog log = weightLogRepository.findByUserIdAndLogDate(user.getId(), date)
                            .orElseGet(() -> { WeightLog l = new WeightLog(); l.setUser(user); l.setLogDate(date); return l; });
                    log.setWeightLbs(new BigDecimal(weightStr));
                    weightLogRepository.save(log);
                    weightImported++;
                }

                // Nutrition aggregates — only used when no detailed nutrition section is present
                if (!hasDetailedNutrition) {
                    String caloriesStr = getString(row, "Calories");
                    String proteinStr  = getString(row, "Protein");
                    if (caloriesStr != null || proteinStr != null) {
                        NutritionLog nutrition = nutritionLogRepository.findByUserIdAndLogDate(user.getId(), date)
                                .orElseGet(() -> { NutritionLog n = new NutritionLog(); n.setUser(user); n.setLogDate(date); n.setDayType("training"); return n; });
                        Meal importedMeal = new Meal();
                        importedMeal.setNutritionLog(nutrition);
                        importedMeal.setMealName("Imported");
                        importedMeal.setCalories(caloriesStr != null ? (int) Math.round(Double.parseDouble(caloriesStr)) : 0);
                        importedMeal.setProteinGrams(proteinStr != null ? (int) Math.round(Double.parseDouble(proteinStr)) : 0);
                        nutrition.getMeals().add(importedMeal);
                        nutritionLogRepository.save(nutrition);
                        nutritionImported++;
                    }
                }

                // Steps
                String stepsStr = getString(row, "Steps");
                if (stepsStr != null) {
                    StepLog stepLog = stepLogRepository.findByUserIdAndLogDate(user.getId(), date)
                            .orElseGet(() -> { StepLog s = new StepLog(); s.setUser(user); s.setLogDate(date); return s; });
                    stepLog.setSteps(Integer.parseInt(stepsStr));
                    stepLogRepository.save(stepLog);
                    stepsImported++;
                }
            }
        }

        // ── Detailed nutrition ────────────────────────────────────────────────
        if (hasDetailedNutrition) {
            Map<LocalDate, List<Map<String, Object>>> nutritionByDate = new LinkedHashMap<>();
            for (Map<String, Object> row : request.getNutrition()) {
                LocalDate date = parseDate(getString(row, "Date"));
                if (date == null) continue;
                nutritionByDate.computeIfAbsent(date, d -> new ArrayList<>()).add(row);
            }
            for (Map.Entry<LocalDate, List<Map<String, Object>>> entry : nutritionByDate.entrySet()) {
                LocalDate date     = entry.getKey();
                List<Map<String, Object>> mealRows = entry.getValue();

                String dayType = getString(mealRows.get(0), "Day Type");
                NutritionLog log = nutritionLogRepository.findByUserIdAndLogDate(user.getId(), date)
                        .orElseGet(() -> { NutritionLog n = new NutritionLog(); n.setUser(user); n.setLogDate(date); return n; });
                log.setDayType(dayType != null ? dayType : "training");

                // Explicitly delete old meals to avoid orphans (no orphanRemoval on the mapping)
                if (log.getId() != null) {
                    mealRepository.deleteAll(mealRepository.findByNutritionLogId(log.getId()));
                    log.getMeals().clear();
                }

                for (Map<String, Object> row : mealRows) {
                    String mealName   = getString(row, "Meal");
                    String caloriesStr = getString(row, "Calories");
                    String proteinStr  = getString(row, "Protein");
                    if (mealName == null && caloriesStr == null && proteinStr == null) continue;
                    Meal meal = new Meal();
                    meal.setNutritionLog(log);
                    meal.setMealName(mealName != null ? mealName : "");
                    meal.setCalories(caloriesStr != null ? (int) Math.round(Double.parseDouble(caloriesStr)) : 0);
                    meal.setProteinGrams(proteinStr != null ? (int) Math.round(Double.parseDouble(proteinStr)) : 0);
                    log.getMeals().add(meal);
                }

                nutritionLogRepository.save(log);
                nutritionImported++;
            }
        }

        // ── Workouts (strength + cardio) ──────────────────────────────────────
        // Group strength rows by date
        Map<LocalDate, List<Map<String, Object>>> strengthByDate = new LinkedHashMap<>();
        if (request.getWorkouts() != null) {
            for (Map<String, Object> row : request.getWorkouts()) {
                LocalDate date = parseDate(getString(row, "Date"));
                if (date == null) continue;
                strengthByDate.computeIfAbsent(date, d -> new ArrayList<>()).add(row);
            }
        }

        // Group cardio rows by date
        Map<LocalDate, List<Map<String, Object>>> cardioByDate = new LinkedHashMap<>();
        if (request.getCardio() != null) {
            for (Map<String, Object> row : request.getCardio()) {
                LocalDate date = parseDate(getString(row, "Date"));
                if (date == null) continue;
                cardioByDate.computeIfAbsent(date, d -> new ArrayList<>()).add(row);
            }
        }

        // All dates with any workout data
        Set<LocalDate> allWorkoutDates = new LinkedHashSet<>();
        allWorkoutDates.addAll(strengthByDate.keySet());
        allWorkoutDates.addAll(cardioByDate.keySet());

        for (LocalDate date : allWorkoutDates) {
            workoutSessionRepository.findByUserIdAndSessionDate(user.getId(), date)
                    .forEach(workoutSessionRepository::delete);

            WorkoutSession session = new WorkoutSession();
            session.setUser(user);
            session.setSessionDate(date);
            session = workoutSessionRepository.save(session);

            // Add strength sets
            Map<String, Integer> setOffsets = new HashMap<>();
            for (Map<String, Object> row : strengthByDate.getOrDefault(date, List.of())) {
                String exerciseName = getString(row, "Exercise");
                Object weightRaw = row.get("Weight");
                if (exerciseName == null || weightRaw == null || weightRaw.toString().isBlank()) continue;

                BigDecimal weightLbs = new BigDecimal(weightRaw.toString());
                int previousSetCount = setOffsets.getOrDefault(exerciseName, 0);
                int localSetIndex = 1;
                while (row.containsKey("Set " + localSetIndex)) {
                    Object repsObj = row.get("Set " + localSetIndex);
                    if (repsObj != null && !repsObj.toString().isBlank()) {
                        ExerciseSet exerciseSet = new ExerciseSet();
                        exerciseSet.setSession(session);
                        exerciseSet.setExerciseName(exerciseName);
                        exerciseSet.setSetNumber(previousSetCount + localSetIndex);
                        exerciseSet.setReps(Integer.parseInt(repsObj.toString()));
                        exerciseSet.setWeightLbs(weightLbs);
                        session.getExerciseSets().add(exerciseSet);
                    }
                    localSetIndex++;
                }
                setOffsets.put(exerciseName, previousSetCount + localSetIndex - 1);
            }

            // Add cardio sets
            for (Map<String, Object> row : cardioByDate.getOrDefault(date, List.of())) {
                String exerciseName = getString(row, "Exercise");
                Object setObj = row.get("Set");
                if (exerciseName == null || setObj == null) continue;

                String distStr = getString(row, "Distance (mi)");
                String durStr  = getString(row, "Duration (sec)");
                if (distStr == null && durStr == null) continue;

                ExerciseSet exerciseSet = new ExerciseSet();
                exerciseSet.setSession(session);
                exerciseSet.setExerciseName(exerciseName);
                exerciseSet.setSetNumber(Integer.parseInt(setObj.toString()));
                exerciseSet.setReps(0);
                exerciseSet.setWeightLbs(BigDecimal.ZERO);
                if (distStr != null) exerciseSet.setDistanceMiles(new BigDecimal(distStr));
                if (durStr  != null) exerciseSet.setDurationSeconds(Integer.parseInt(durStr));
                session.getExerciseSets().add(exerciseSet);
            }

            workoutSessionRepository.save(session);
            workoutsImported++;
        }

        return new ImportResultDTO(
                weightImported, weightSkipped,
                nutritionImported, nutritionSkipped,
                workoutsImported, workoutsSkipped,
                stepsImported, stepsSkipped);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /** Parse "M/D/YY" → LocalDate, e.g. "1/15/24" → 2024-01-15 */
    private LocalDate parseDate(String s) {
        if (s == null) return null;
        try {
            String[] parts = s.split("/");
            int month = Integer.parseInt(parts[0]);
            int day   = Integer.parseInt(parts[1]);
            int year  = 2000 + Integer.parseInt(parts[2]);
            return LocalDate.of(year, month, day);
        } catch (Exception e) {
            return null;
        }
    }

    private String getString(Map<String, Object> row, String key) {
        Object value = row.get(key);
        return (value == null || value.toString().isBlank()) ? null : value.toString();
    }
}
