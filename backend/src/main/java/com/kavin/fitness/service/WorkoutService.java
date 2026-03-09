package com.kavin.fitness.service;

import com.kavin.fitness.dto.ExerciseRequest;
import com.kavin.fitness.dto.WorkoutSessionDTO;
import com.kavin.fitness.dto.WorkoutSessionRequest;
import com.kavin.fitness.model.ExerciseSet;
import com.kavin.fitness.model.User;
import com.kavin.fitness.model.WorkoutSession;
import com.kavin.fitness.repository.ExerciseSetRepository;
import com.kavin.fitness.repository.WorkoutSessionRepository;
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
        session = workoutSessionRepository.save(session);

        if (request.getExercises() != null) {
            for (ExerciseRequest ex : request.getExercises()) {
                addSetsForExercise(session, ex);
            }
            session = workoutSessionRepository.save(session);
        }

        return toDTO(session);
    }

    /** Replace all sets for the named exercise in this session. */
    @Transactional
    public WorkoutSessionDTO upsertExercise(Long sessionId, Long userId, ExerciseRequest request) {
        WorkoutSession session = resolveSession(sessionId, userId);

        // remove old sets for this exercise name
        session.getExerciseSets().removeIf(es ->
                es.getExerciseName().equalsIgnoreCase(request.getExerciseName()));

        addSetsForExercise(session, request);
        session = workoutSessionRepository.save(session);
        return toDTO(session);
    }

    /** Delete all sets for the named exercise in this session. */
    @Transactional
    public void deleteExercise(Long sessionId, Long userId, String exerciseName) {
        WorkoutSession session = resolveSession(sessionId, userId);
        session.getExerciseSets().removeIf(es ->
                es.getExerciseName().equalsIgnoreCase(exerciseName));
        workoutSessionRepository.save(session);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private void addSetsForExercise(WorkoutSession session, ExerciseRequest ex) {
        for (ExerciseRequest.SetRequest sr : ex.getSets()) {
            ExerciseSet es = new ExerciseSet();
            es.setSession(session);
            es.setExerciseName(ex.getExerciseName());
            es.setSetNumber(sr.getSetNumber());
            es.setReps(sr.getReps());
            es.setWeightLbs(sr.getWeightLbs());
            session.getExerciseSets().add(es);
        }
    }

    private WorkoutSession resolveSession(Long sessionId, Long userId) {
        return workoutSessionRepository.findById(sessionId)
                .filter(s -> s.getUser().getId().equals(userId))
                .orElseThrow(() -> new IllegalArgumentException("Session not found"));
    }

    private WorkoutSessionDTO toDTO(WorkoutSession session) {
        List<WorkoutSessionDTO.SetDTO> sets = session.getExerciseSets().stream()
                .map(s -> new WorkoutSessionDTO.SetDTO(
                        s.getId(), s.getExerciseName(), s.getSetNumber(),
                        s.getReps(), s.getWeightLbs(), s.getCompleted()))
                .collect(Collectors.toList());
        return new WorkoutSessionDTO(session.getId(), session.getSessionDate(), sets);
    }
}
