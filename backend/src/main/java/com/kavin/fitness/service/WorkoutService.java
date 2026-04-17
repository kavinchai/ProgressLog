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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class WorkoutService {

    @Autowired private WorkoutSessionRepository workoutSessionRepository;
    @Autowired private ExerciseSetRepository exerciseSetRepository;

    @Transactional(readOnly = true)
    public List<String> getDistinctExerciseNames(Long userId) {
        return exerciseSetRepository.findDistinctExerciseNamesByUserId(userId);
    }

    @Transactional(readOnly = true)
    public List<WorkoutSessionDTO> getWorkoutSessions(Long userId) {
        return workoutSessionRepository
                .findByUserIdWithSetsOrderByDateAsc(userId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional
    public WorkoutSessionDTO save(User user, WorkoutSessionRequest request) {
        WorkoutSession session = new WorkoutSession();
        session.setUser(user);
        session.setSessionDate(request.getSessionDate());
        session.setSessionName(request.getSessionName());
        session = workoutSessionRepository.save(session);

        if (request.getExercises() != null) {
            for (ExerciseRequest exerciseRequest : request.getExercises()) {
                addSetsForExercise(session, exerciseRequest);
            }
            session = workoutSessionRepository.save(session);
        }

        return toDTO(session);
    }

    /** Rename an existing workout session. */
    @Transactional
    public WorkoutSessionDTO renameSession(Long sessionId, Long userId, String sessionName) {
        WorkoutSession session = resolveSession(sessionId, userId);
        session.setSessionName(sessionName);
        session = workoutSessionRepository.save(session);
        return toDTO(session);
    }

    /** Delete an entire workout session. */
    @Transactional
    public void deleteSession(Long sessionId, Long userId) {
        WorkoutSession session = resolveSession(sessionId, userId);
        workoutSessionRepository.delete(session);
    }

    /** Replace all sets for the named exercise in this session. */
    @Transactional
    public WorkoutSessionDTO upsertExercise(Long sessionId, Long userId, ExerciseRequest request) {
        WorkoutSession session = resolveSession(sessionId, userId);

        // remove old sets for this exercise name
        session.getExerciseSets().removeIf(exerciseSet ->
                exerciseSet.getExerciseName().equalsIgnoreCase(request.getExerciseName()));

        addSetsForExercise(session, request);
        session = workoutSessionRepository.save(session);
        return toDTO(session);
    }

    /** Replace the entire workout session (name + all exercises). */
    @Transactional
    public WorkoutSessionDTO updateSession(Long sessionId, Long userId, WorkoutSessionRequest request) {
        WorkoutSession session = resolveSession(sessionId, userId);
        session.setSessionName(request.getSessionName());
        session.getExerciseSets().clear();
        workoutSessionRepository.flush();

        if (request.getExercises() != null) {
            for (ExerciseRequest exerciseRequest : request.getExercises()) {
                addSetsForExercise(session, exerciseRequest);
            }
        }
        session = workoutSessionRepository.save(session);
        return toDTO(session);
    }

    /** Delete all sets for the named exercise in this session. */
    @Transactional
    public void deleteExercise(Long sessionId, Long userId, String exerciseName) {
        WorkoutSession session = resolveSession(sessionId, userId);
        session.getExerciseSets().removeIf(exerciseSet ->
                exerciseSet.getExerciseName().equalsIgnoreCase(exerciseName));
        workoutSessionRepository.save(session);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private void addSetsForExercise(WorkoutSession session, ExerciseRequest exerciseRequest) {
        for (ExerciseRequest.SetRequest setRequest : exerciseRequest.getSets()) {
            ExerciseSet exerciseSet = new ExerciseSet();
            exerciseSet.setSession(session);
            exerciseSet.setExerciseName(exerciseRequest.getExerciseName());
            exerciseSet.setSetNumber(setRequest.getSetNumber());
            exerciseSet.setReps(setRequest.getReps());
            exerciseSet.setWeightLbs(setRequest.getWeightLbs());
            exerciseSet.setDistanceMiles(setRequest.getDistanceMiles());
            exerciseSet.setDurationSeconds(setRequest.getDurationSeconds());
            session.getExerciseSets().add(exerciseSet);
        }
    }

    private WorkoutSession resolveSession(Long sessionId, Long userId) {
        return workoutSessionRepository.findById(sessionId)
                .filter(session -> session.getUser().getId().equals(userId))
                .orElseThrow(() -> new EntityNotFoundException("Session not found"));
    }

    private WorkoutSessionDTO toDTO(WorkoutSession session) {
        List<WorkoutSessionDTO.SetDTO> sets = session.getExerciseSets().stream()
                .map(exerciseSet -> new WorkoutSessionDTO.SetDTO(
                        exerciseSet.getId(), exerciseSet.getExerciseName(), exerciseSet.getSetNumber(),
                        exerciseSet.getReps(), exerciseSet.getWeightLbs(), exerciseSet.getCompleted(),
                        exerciseSet.getDistanceMiles(), exerciseSet.getDurationSeconds()))
                .collect(Collectors.toList());
        return new WorkoutSessionDTO(session.getId(), session.getSessionDate(), session.getSessionName(), sets);
    }
}
