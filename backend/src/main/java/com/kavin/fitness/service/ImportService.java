package com.kavin.fitness.service;

import com.kavin.fitness.dto.ImportRequest;
import com.kavin.fitness.dto.ImportResultDTO;
import com.kavin.fitness.model.ExerciseSet;
import com.kavin.fitness.model.NutritionLog;
import com.kavin.fitness.model.User;
import com.kavin.fitness.model.WeightLog;
import com.kavin.fitness.model.WorkoutSession;
import com.kavin.fitness.repository.NutritionLogRepository;
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

    @Transactional
    public ImportResultDTO importData(User user, ImportRequest request) {
        int weightImported = 0, weightSkipped = 0;
        int nutritionImported = 0, nutritionSkipped = 0;
        int workoutsImported = 0, workoutsSkipped = 0;

        // ── Weight + Nutrition ────────────────────────────────────────────────
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
                    if (hasCalories) nutrition.setCalories((int) Math.round(Double.parseDouble(caloriesRaw.toString())));
                    if (hasProtein)  nutrition.setProteinGrams((int) Math.round(Double.parseDouble(proteinRaw.toString())));
                    nutritionLogRepository.save(nutrition);
                    nutritionImported++;
                }
            }
        }

        // ── Workouts ──────────────────────────────────────────────────────────
        if (request.getWorkouts() != null) {
            Map<LocalDate, List<Map<String, Object>>> byDate = new LinkedHashMap<>();
            for (Map<String, Object> row : request.getWorkouts()) {
                String dateStr = getString(row, "Date");
                if (dateStr == null) continue;
                LocalDate date = parseDate(dateStr);
                if (date == null) continue;
                byDate.computeIfAbsent(date, d -> new ArrayList<>()).add(row);
            }

            for (Map.Entry<LocalDate, List<Map<String, Object>>> entry : byDate.entrySet()) {
                LocalDate date = entry.getKey();
                workoutSessionRepository.findByUserIdAndSessionDate(user.getId(), date)
                        .ifPresent(workoutSessionRepository::delete);

                WorkoutSession session = new WorkoutSession();
                session.setUser(user);
                session.setSessionDate(date);
                session = workoutSessionRepository.save(session);

                Map<String, Integer> setOffsets = new HashMap<>();
                for (Map<String, Object> row : entry.getValue()) {
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

                workoutSessionRepository.save(session);
                workoutsImported++;
            }
        }

        return new ImportResultDTO(weightImported, weightSkipped, nutritionImported, nutritionSkipped, workoutsImported, workoutsSkipped);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /** Parse "M/D/YY" → LocalDate, e.g. "1/15/24" → 2024-01-15 */
    private LocalDate parseDate(String s) {
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
