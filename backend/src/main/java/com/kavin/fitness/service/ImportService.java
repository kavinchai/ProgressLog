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

    @Transactional
    public ImportResultDTO importData(User user, ImportRequest request) {
        int weightImported = 0, weightSkipped = 0;
        int nutritionImported = 0, nutritionSkipped = 0;
        int workoutsImported = 0, workoutsSkipped = 0;
        int stepsImported = 0, stepsSkipped = 0;

        // ── Weight + Nutrition + Steps ─────────────────────────────────────────
        if (request.getTotalStats() != null) {
            for (Map<String, Object> row : request.getTotalStats()) {
                String dateStr = getString(row, "Date");
                if (dateStr == null) continue;
                LocalDate date = parseDate(dateStr);
                if (date == null) continue;

                // Weight
                Object weightRaw = row.get("Weight");
                if (weightRaw != null && !weightRaw.toString().isBlank()) {
                    WeightLog log = weightLogRepository.findByUserIdAndLogDate(user.getId(), date)
                            .orElseGet(() -> { WeightLog l = new WeightLog(); l.setUser(user); l.setLogDate(date); return l; });
                    log.setWeightLbs(new BigDecimal(weightRaw.toString()));
                    weightLogRepository.save(log);
                    weightImported++;
                }

                // Nutrition (calories + protein)
                Object caloriesRaw = row.get("Calories");
                Object proteinRaw  = row.get("Protein");
                boolean hasCalories = caloriesRaw != null && !caloriesRaw.toString().isBlank();
                boolean hasProtein  = proteinRaw  != null && !proteinRaw.toString().isBlank();
                if (hasCalories || hasProtein) {
                    NutritionLog nutrition = nutritionLogRepository.findByUserIdAndLogDate(user.getId(), date)
                            .orElseGet(() -> { NutritionLog n = new NutritionLog(); n.setUser(user); n.setLogDate(date); n.setDayType("training"); return n; });
                    Meal importedMeal = new Meal();
                    importedMeal.setNutritionLog(nutrition);
                    importedMeal.setMealName("Imported");
                    importedMeal.setCalories(hasCalories ? (int) Math.round(Double.parseDouble(String.valueOf(caloriesRaw))) : 0);
                    importedMeal.setProteinGrams(hasProtein ? (int) Math.round(Double.parseDouble(String.valueOf(proteinRaw))) : 0);
                    nutrition.getMeals().add(importedMeal);
                    nutritionLogRepository.save(nutrition);
                    nutritionImported++;
                }

                // Steps
                Object stepsRaw = row.get("Steps");
                if (stepsRaw != null && !stepsRaw.toString().isBlank()) {
                    StepLog stepLog = stepLogRepository.findByUserIdAndLogDate(user.getId(), date)
                            .orElseGet(() -> { StepLog s = new StepLog(); s.setUser(user); s.setLogDate(date); return s; });
                    stepLog.setSteps(Integer.parseInt(stepsRaw.toString()));
                    stepLogRepository.save(stepLog);
                    stepsImported++;
                }
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
