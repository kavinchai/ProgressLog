package com.kavin.fitness.service;

import com.kavin.fitness.dto.SharedCalendarDTO;
import com.kavin.fitness.model.ExerciseSet;
import com.kavin.fitness.model.User;
import com.kavin.fitness.model.WorkoutSession;
import com.kavin.fitness.repository.UserRepository;
import com.kavin.fitness.repository.WorkoutSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class SharedCalendarService {

    @Autowired private UserRepository             userRepository;
    @Autowired private WorkoutSessionRepository   workoutSessionRepository;

    public SharedCalendarDTO getCalendar() {
        List<User> sharers = userRepository.findByShareCalendarTrue();
        if (sharers.isEmpty()) {
            return new SharedCalendarDTO(0, List.of());
        }

        Map<Long, String> userIdToName = sharers.stream()
                .collect(Collectors.toMap(User::getId, User::getUsername));

        List<WorkoutSession> sessions = workoutSessionRepository
                .findByUserIdInWithSetsOrderByDateDesc(new ArrayList<>(userIdToName.keySet()));

        List<SharedCalendarDTO.Entry> entries = sessions.stream()
                .filter(s -> !s.getExerciseSets().isEmpty())
                .map(s -> new SharedCalendarDTO.Entry(
                        userIdToName.getOrDefault(s.getUser().getId(), "unknown"),
                        s.getSessionDate(),
                        s.getSessionName(),
                        toSets(s.getExerciseSets())
                ))
                .collect(Collectors.toList());

        return new SharedCalendarDTO(sharers.size(), entries);
    }

    private static List<SharedCalendarDTO.Set> toSets(List<ExerciseSet> sets) {
        return sets.stream()
                .sorted(Comparator
                        .comparing(ExerciseSet::getExerciseName,
                                Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(ExerciseSet::getSetNumber,
                                Comparator.nullsLast(Comparator.naturalOrder())))
                .map(s -> new SharedCalendarDTO.Set(
                        s.getExerciseName(),
                        s.getSetNumber(),
                        s.getReps(),
                        s.getWeightLbs(),
                        s.getDistanceMiles(),
                        s.getDurationSeconds()
                ))
                .collect(Collectors.toList());
    }
}
