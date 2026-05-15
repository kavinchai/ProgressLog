package com.kavin.fitness.service;

import com.kavin.fitness.dto.ExerciseRequest;
import com.kavin.fitness.dto.WorkoutSessionDTO;
import com.kavin.fitness.dto.WorkoutSessionRequest;
import com.kavin.fitness.dto.snapshot.ExerciseSetsSnapshot;
import com.kavin.fitness.model.ExerciseSet;
import com.kavin.fitness.model.User;
import com.kavin.fitness.model.WorkoutSession;
import com.kavin.fitness.repository.ExerciseSetRepository;
import com.kavin.fitness.repository.WorkoutSessionRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class WorkoutService {

    @Autowired private WorkoutSessionRepository workoutSessionRepository;
    @Autowired private ExerciseSetRepository exerciseSetRepository;
    @Autowired private DeletionJournalService deletionJournal;

    @Transactional(readOnly = true)
    public List<String> getDistinctExerciseNames(Long userId) {
        return exerciseSetRepository.findDistinctExerciseNamesByUserId(userId);
    }

    @Transactional(readOnly = true)
    public List<WorkoutSessionDTO> getWorkoutSessions(Long userId, LocalDate date) {
        if (date != null) {
            return workoutSessionRepository.findByUserIdAndSessionDate(userId, date)
                    .stream().map(this::toDTO).collect(Collectors.toList());
        }
        return workoutSessionRepository
                .findByUserIdWithSetsOrderByDateAsc(userId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public WorkoutSessionDTO getWorkoutSession(Long sessionId, Long userId) {
        return toDTO(resolveSession(sessionId, userId));
    }

    @Transactional(readOnly = true)
    public List<WorkoutSessionDTO> getWorkoutsByExercise(Long userId, String exerciseName) {
        List<ExerciseSet> sets = exerciseSetRepository.findByUserIdAndExerciseNameOrderByDate(userId, exerciseName);
        List<Long> sessionIds = sets.stream()
                .map(set -> set.getSession().getId())
                .distinct()
                .collect(Collectors.toList());
        return sessionIds.stream()
                .map(id -> workoutSessionRepository.findById(id).orElse(null))
                .filter(session -> session != null && session.getUser().getId().equals(userId))
                .map(this::toDTO)
                .collect(Collectors.toList());
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
        deletionJournal.record(
                session.getUser(),
                DeletionJournalService.TYPE_WORKOUT_SESSION,
                workoutSessionSummary(session),
                buildSessionSnapshot(session));
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
        session.setSessionDate(request.getSessionDate());
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

        List<ExerciseSet> doomed = session.getExerciseSets().stream()
                .filter(es -> es.getExerciseName().equalsIgnoreCase(exerciseName))
                .toList();
        if (!doomed.isEmpty()) {
            deletionJournal.record(
                    session.getUser(),
                    DeletionJournalService.TYPE_EXERCISE_SET,
                    String.format("\"%s\" (%d set%s) from workout on %s",
                            doomed.get(0).getExerciseName(),
                            doomed.size(),
                            doomed.size() == 1 ? "" : "s",
                            session.getSessionDate()),
                    buildExerciseSetsSnapshot(session.getId(), doomed.get(0).getExerciseName(), doomed));
        }

        session.getExerciseSets().removeIf(exerciseSet ->
                exerciseSet.getExerciseName().equalsIgnoreCase(exerciseName));
        workoutSessionRepository.save(session);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /**
     * Resolve an exercise name to the canonical form already used by this user.
     * Matches singular ↔ plural variants (trailing "s") case-insensitively.
     * Returns the existing name if found, otherwise the original input.
     */
    private String resolveCanonicalName(Long userId, String name) {
        List<String> existing = exerciseSetRepository.findDistinctExerciseNamesByUserId(userId);
        String nameLower = name.toLowerCase();
        for (String e : existing) {
            String eLower = e.toLowerCase();
            if (eLower.equals(nameLower)) return e;
            // "Squat" matches "Squats" and vice versa
            if (eLower.equals(nameLower + "s") || (nameLower.equals(eLower + "s"))) return e;
        }
        return name;
    }

    private void addSetsForExercise(WorkoutSession session, ExerciseRequest exerciseRequest) {
        String canonical = resolveCanonicalName(session.getUser().getId(), exerciseRequest.getExerciseName());
        for (ExerciseRequest.SetRequest setRequest : exerciseRequest.getSets()) {
            ExerciseSet exerciseSet = new ExerciseSet();
            exerciseSet.setSession(session);
            exerciseSet.setExerciseName(canonical);
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

    // ── snapshot helpers (deletion journal) ──────────────────────────────────

    private String workoutSessionSummary(WorkoutSession session) {
        long distinctExercises = session.getExerciseSets().stream()
                .map(ExerciseSet::getExerciseName).distinct().count();
        String label = session.getSessionName() != null && !session.getSessionName().isBlank()
                ? "\"" + session.getSessionName() + "\""
                : "session";
        return String.format("Workout %s on %s (%d exercise%s)",
                label,
                session.getSessionDate(),
                distinctExercises,
                distinctExercises == 1 ? "" : "s");
    }

    private WorkoutSessionRequest buildSessionSnapshot(WorkoutSession session) {
        WorkoutSessionRequest req = new WorkoutSessionRequest();
        req.setSessionDate(session.getSessionDate());
        req.setSessionName(session.getSessionName());
        req.setExercises(buildExerciseRequests(session.getExerciseSets()));
        return req;
    }

    private ExerciseSetsSnapshot buildExerciseSetsSnapshot(Long sessionId, String exerciseName, List<ExerciseSet> sets) {
        List<ExerciseRequest.SetRequest> setRequests = sets.stream()
                .sorted((a, b) -> Integer.compare(a.getSetNumber(), b.getSetNumber()))
                .map(this::toSetRequest)
                .toList();
        return new ExerciseSetsSnapshot(sessionId, exerciseName, setRequests);
    }

    private List<ExerciseRequest> buildExerciseRequests(List<ExerciseSet> sets) {
        java.util.LinkedHashMap<String, List<ExerciseRequest.SetRequest>> grouped = new java.util.LinkedHashMap<>();
        for (ExerciseSet set : sets) {
            grouped.computeIfAbsent(set.getExerciseName(), k -> new ArrayList<>())
                    .add(toSetRequest(set));
        }
        return grouped.entrySet().stream()
                .map(e -> {
                    ExerciseRequest req = new ExerciseRequest();
                    req.setExerciseName(e.getKey());
                    req.setSets(e.getValue());
                    return req;
                })
                .collect(Collectors.toList());
    }

    private ExerciseRequest.SetRequest toSetRequest(ExerciseSet set) {
        ExerciseRequest.SetRequest sr = new ExerciseRequest.SetRequest();
        sr.setSetNumber(set.getSetNumber());
        sr.setReps(set.getReps());
        sr.setWeightLbs(set.getWeightLbs());
        sr.setDistanceMiles(set.getDistanceMiles());
        sr.setDurationSeconds(set.getDurationSeconds());
        return sr;
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
