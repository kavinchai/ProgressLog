package com.kavin.fitness.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kavin.fitness.dto.ExerciseRequest;
import com.kavin.fitness.dto.MealRequest;
import com.kavin.fitness.dto.NutritionLogRequest;
import com.kavin.fitness.dto.StepLogRequest;
import com.kavin.fitness.dto.UndoActionDTO;
import com.kavin.fitness.dto.WeightLogRequest;
import com.kavin.fitness.dto.WorkoutSessionRequest;
import com.kavin.fitness.dto.snapshot.ExerciseSetsSnapshot;
import com.kavin.fitness.dto.snapshot.MealSnapshot;
import com.kavin.fitness.dto.snapshot.NutritionLogSnapshot;
import com.kavin.fitness.model.DeletionJournalEntry;
import com.kavin.fitness.model.NutritionLog;
import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.DeletionJournalRepository;
import com.kavin.fitness.repository.NutritionLogRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Replays the most recent un-restored entry in the deletion journal
 * by re-creating the deleted data through the existing service code.
 * Restored entities receive fresh IDs — callers must not rely on the
 * pre-deletion ID being preserved.
 */
@Service
public class UndoService {

    @Autowired private DeletionJournalRepository journalRepository;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private WorkoutService workoutService;
    @Autowired private NutritionService nutritionService;
    @Autowired private NutritionLogRepository nutritionLogRepository;
    @Autowired private StepService stepService;
    @Autowired private WeightService weightService;

    @Transactional
    public UndoActionDTO undoLast(User user) {
        DeletionJournalEntry entry = journalRepository
                .findFirstByUserIdAndRestoredAtIsNullOrderByCreatedAtDesc(user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Nothing to undo"));

        switch (entry.getEntityType()) {
            case DeletionJournalService.TYPE_WORKOUT_SESSION -> restoreWorkoutSession(entry, user);
            case DeletionJournalService.TYPE_EXERCISE_SET    -> restoreExerciseSets(entry, user);
            case DeletionJournalService.TYPE_NUTRITION_LOG   -> restoreNutritionLog(entry, user);
            case DeletionJournalService.TYPE_MEAL            -> restoreMeal(entry, user);
            case DeletionJournalService.TYPE_STEP_LOG        -> restoreStepLog(entry, user);
            case DeletionJournalService.TYPE_WEIGHT_LOG      -> restoreWeightLog(entry, user);
            default -> throw new IllegalStateException(
                    "Unknown deletion journal entityType: " + entry.getEntityType());
        }

        entry.setRestoredAt(Instant.now());
        journalRepository.save(entry);

        return new UndoActionDTO(
                entry.getId(),
                entry.getEntityType(),
                entry.getSummary(),
                entry.getCreatedAt());
    }

    // ── restorers ────────────────────────────────────────────────────────────

    private void restoreWorkoutSession(DeletionJournalEntry entry, User user) {
        WorkoutSessionRequest req = readSnapshot(entry, WorkoutSessionRequest.class);
        workoutService.save(user, req);
    }

    private void restoreExerciseSets(DeletionJournalEntry entry, User user) {
        ExerciseSetsSnapshot snap = readSnapshot(entry, ExerciseSetsSnapshot.class);
        ExerciseRequest req = new ExerciseRequest();
        req.setExerciseName(snap.getExerciseName());
        req.setSets(snap.getSets());
        workoutService.upsertExercise(snap.getSessionId(), user.getId(), req);
    }

    private void restoreNutritionLog(DeletionJournalEntry entry, User user) {
        NutritionLogSnapshot snap = readSnapshot(entry, NutritionLogSnapshot.class);
        NutritionLogRequest req = new NutritionLogRequest();
        req.setLogDate(snap.getLogDate());
        req.setDayType(snap.getDayType());
        var dto = nutritionService.upsertLog(user, req);
        if (snap.getMeals() != null) {
            for (MealRequest meal : snap.getMeals()) {
                nutritionService.addMeal(dto.getId(), user.getId(), meal);
            }
        }
    }

    private void restoreMeal(DeletionJournalEntry entry, User user) {
        MealSnapshot snap = readSnapshot(entry, MealSnapshot.class);
        // Ensure the parent log still exists and belongs to this user.
        NutritionLog log = nutritionLogRepository.findById(snap.getLogId())
                .filter(n -> n.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new EntityNotFoundException(
                        "Cannot restore meal — its day log no longer exists. " +
                        "Undo the day log first."));
        MealRequest req = new MealRequest();
        req.setMealName(snap.getMealName());
        req.setCalories(snap.getCalories());
        req.setProteinGrams(snap.getProteinGrams());
        nutritionService.addMeal(log.getId(), user.getId(), req);
    }

    private void restoreStepLog(DeletionJournalEntry entry, User user) {
        StepLogRequest req = readSnapshot(entry, StepLogRequest.class);
        stepService.save(user, req);
    }

    private void restoreWeightLog(DeletionJournalEntry entry, User user) {
        WeightLogRequest req = readSnapshot(entry, WeightLogRequest.class);
        weightService.save(user, req);
    }

    private <T> T readSnapshot(DeletionJournalEntry entry, Class<T> type) {
        try {
            return objectMapper.readValue(entry.getSnapshot(), type);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(
                    "Failed to deserialize deletion journal entry " + entry.getId(), e);
        }
    }

    // ── recent listing (delegate to DeletionJournalService) ──────────────────

    @Transactional(readOnly = true)
    public List<UndoActionDTO> getRecentActions(Long userId) {
        return journalRepository
                .findTop20ByUserIdAndRestoredAtIsNullOrderByCreatedAtDesc(userId)
                .stream()
                .map(entry -> new UndoActionDTO(
                        entry.getId(),
                        entry.getEntityType(),
                        entry.getSummary(),
                        entry.getCreatedAt()))
                .toList();
    }
}
