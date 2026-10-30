package com.kavin.fitness.service;

import com.kavin.fitness.dto.ExerciseMatchesDTO;
import com.kavin.fitness.repository.ExerciseSetRepository;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Finds existing lift names a typed name may refer to, from the viewer's own lifts and lifts logged
 * by people who share on the leaderboard (others' names stay private).
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ExerciseNameService {

    private static final int MAX_POSSIBLE = 5;

    private final ExerciseSetRepository exerciseSetRepository;

    public ExerciseMatchesDTO findMatches(Long userId, String typed) {
        if (typed == null || typed.isBlank()) {
            return new ExerciseMatchesDTO(null, List.of(), List.of());
        }
        String name = typed.trim();

        Map<String, ExerciseMatchesDTO.Match> known = new LinkedHashMap<>();
        for (Object[] row : exerciseSetRepository.countSessionsPerLiftName(userId)) {
            known.put(
                    (String) row[0],
                    new ExerciseMatchesDTO.Match(
                            (String) row[0], ((Number) row[1]).longValue(), 0));
        }
        for (Object[] row : exerciseSetRepository.countSharersPerLiftName()) {
            known.computeIfAbsent((String) row[0], n -> new ExerciseMatchesDTO.Match(n, 0, 0))
                    .setLifters(((Number) row[1]).longValue());
        }

        Comparator<ExerciseMatchesDTO.Match> mostUsed =
                Comparator.comparingLong(ExerciseMatchesDTO.Match::getYourSessions)
                        .reversed()
                        .thenComparing(
                                Comparator.comparingLong(ExerciseMatchesDTO.Match::getLifters)
                                        .reversed())
                        .thenComparing(ExerciseMatchesDTO.Match::getName);

        ExerciseMatchesDTO.Match exact = known.get(name);
        List<ExerciseMatchesDTO.Match> others =
                known.values().stream().filter(m -> !m.getName().equals(name)).toList();
        List<ExerciseMatchesDTO.Match> same =
                others.stream()
                        .filter(m -> ExerciseNameMatcher.isSameLift(name, m.getName()))
                        .sorted(mostUsed)
                        .toList();
        List<ExerciseMatchesDTO.Match> possible =
                others.stream()
                        .filter(m -> !same.contains(m))
                        .filter(m -> ExerciseNameMatcher.containsAllWords(name, m.getName()))
                        .sorted(mostUsed)
                        .limit(MAX_POSSIBLE)
                        .toList();
        return new ExerciseMatchesDTO(exact, same, possible);
    }
}
