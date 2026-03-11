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
                Object weightObj = row.get("Weight");
                if (weightObj != null && !weightObj.toString().isBlank()) {
                    if (weightLogRepository.existsByUserIdAndLogDate(user.getId(), date)) {
                        weightSkipped++;
                    } else {
                        WeightLog log = new WeightLog();
                        log.setUser(user);
                        log.setLogDate(date);
                        log.setWeightLbs(new BigDecimal(weightObj.toString()));
                        weightLogRepository.save(log);
                        weightImported++;
                    }
                }

                // Nutrition (calories + protein)
                Object calObj  = row.get("Calories");
                Object protObj = row.get("Protein");
                boolean hasCalories = calObj  != null && !calObj.toString().isBlank();
                boolean hasProtein  = protObj != null && !protObj.toString().isBlank();
                if (hasCalories || hasProtein) {
                    if (nutritionLogRepository.findByUserIdAndLogDate(user.getId(), date).isPresent()) {
                        nutritionSkipped++;
                    } else {
                        NutritionLog nutrition = new NutritionLog();
                        nutrition.setUser(user);
                        nutrition.setLogDate(date);
                        nutrition.setDayType("training"); // default; not stored in export
                        nutrition.setCalories(hasCalories ? (int) Math.round(Double.parseDouble(calObj.toString())) : null);
                        nutrition.setProteinGrams(hasProtein ? (int) Math.round(Double.parseDouble(protObj.toString())) : null);
                        nutritionLogRepository.save(nutrition);
                        nutritionImported++;
                    }
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
                if (workoutSessionRepository.existsByUserIdAndSessionDate(user.getId(), date)) {
                    workoutsSkipped++;
                    continue;
                }

                WorkoutSession session = new WorkoutSession();
                session.setUser(user);
                session.setSessionDate(date);
                session = workoutSessionRepository.save(session);

                for (Map<String, Object> row : entry.getValue()) {
                    String exerciseName = getString(row, "Exercise");
                    Object wObj = row.get("Weight");
                    if (exerciseName == null || wObj == null || wObj.toString().isBlank()) continue;

                    BigDecimal weightLbs = new BigDecimal(wObj.toString());
                    int setNumber = 1;
                    while (row.containsKey("Set " + setNumber)) {
                        Object repsObj = row.get("Set " + setNumber);
                        if (repsObj != null && !repsObj.toString().isBlank()) {
                            ExerciseSet es = new ExerciseSet();
                            es.setSession(session);
                            es.setExerciseName(exerciseName);
                            es.setSetNumber(setNumber);
                            es.setReps(Integer.parseInt(repsObj.toString()));
                            es.setWeightLbs(weightLbs);
                            session.getExerciseSets().add(es);
                        }
                        setNumber++;
                    }
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
        Object v = row.get(key);
        return (v == null || v.toString().isBlank()) ? null : v.toString();
    }
}
