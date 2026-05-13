package com.kavin.fitness.service;

import com.kavin.fitness.dto.LeaderboardDTO;
import com.kavin.fitness.model.ExerciseSet;
import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.ExerciseSetRepository;
import com.kavin.fitness.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class LeaderboardService {

    private static final int TOP_N_PER_EXERCISE = 10;
    private static final int TOP_N_LIFTERS      = 10;
    private static final int ACTIVITY_DAYS      = 30;

    @Autowired private UserRepository        userRepository;
    @Autowired private ExerciseSetRepository exerciseSetRepository;

    public LeaderboardDTO getLeaderboard() {
        List<User> sharers = userRepository.findByShareDataTrue();
        if (sharers.isEmpty()) {
            return new LeaderboardDTO(0, 0, 0, List.of(), List.of(), List.of());
        }

        Map<Long, String> userIdToName = sharers.stream()
                .collect(Collectors.toMap(User::getId, User::getUsername));
        List<Long> userIds = new ArrayList<>(userIdToName.keySet());

        List<ExerciseSet> sets = exerciseSetRepository.findByUserIdIn(userIds);

        Set<Long> sessionIds = new HashSet<>();
        for (ExerciseSet s : sets) sessionIds.add(s.getSession().getId());

        List<LeaderboardDTO.ExerciseLeaderboard> exercises = buildExerciseLeaderboards(sets, userIdToName);
        List<LeaderboardDTO.TopUser>             topLifters = buildTopLifters(sets, userIdToName);
        List<LeaderboardDTO.ActivityPoint>       activity   = buildActivity(sets);

        return new LeaderboardDTO(
                sharers.size(),
                sessionIds.size(),
                sets.size(),
                exercises,
                topLifters,
                activity
        );
    }

    private List<LeaderboardDTO.ExerciseLeaderboard> buildExerciseLeaderboards(
            List<ExerciseSet> sets, Map<Long, String> userIdToName) {

        Map<String, List<ExerciseSet>> byExercise = sets.stream()
                .collect(Collectors.groupingBy(ExerciseSet::getExerciseName));

        List<LeaderboardDTO.ExerciseLeaderboard> result = new ArrayList<>();

        for (Map.Entry<String, List<ExerciseSet>> entry : byExercise.entrySet()) {
            String name = entry.getKey();
            List<ExerciseSet> exSets = entry.getValue();

            boolean isCardio     = exSets.stream().anyMatch(s -> s.getDistanceMiles() != null);
            boolean isStrength   = exSets.stream().anyMatch(
                    s -> s.getDistanceMiles() == null && s.getDurationSeconds() == null);
            // Skip timed-only activities (duration but no distance and no weight/reps sets).
            if (!isCardio && !isStrength) continue;

            // If the exercise has both types of sets, let the type be determined by presence of distance.
            boolean classify = isCardio;

            List<LeaderboardDTO.Entry> entries = classify
                    ? cardioEntries(exSets, userIdToName)
                    : strengthEntries(exSets, userIdToName);

            Set<Long> participants = new HashSet<>();
            for (ExerciseSet s : exSets) participants.add(s.getSession().getUser().getId());

            result.add(new LeaderboardDTO.ExerciseLeaderboard(
                    name,
                    classify ? "cardio" : "strength",
                    exSets.size(),
                    participants.size(),
                    entries
            ));
        }

        result.sort(Comparator.comparingInt(LeaderboardDTO.ExerciseLeaderboard::getTotalSets).reversed()
                .thenComparing(LeaderboardDTO.ExerciseLeaderboard::getExerciseName));
        return result;
    }

    private List<LeaderboardDTO.Entry> strengthEntries(List<ExerciseSet> sets, Map<Long, String> userIdToName) {
        // Per user: pick the best single set ranked by weight then reps.
        Map<Long, ExerciseSet> bestByUser = new HashMap<>();
        for (ExerciseSet s : sets) {
            if (s.getDistanceMiles() != null || s.getDurationSeconds() != null) continue;
            Long uid = s.getSession().getUser().getId();
            ExerciseSet current = bestByUser.get(uid);
            if (current == null || setComparator().compare(s, current) < 0) {
                bestByUser.put(uid, s);
            }
        }

        List<LeaderboardDTO.Entry> entries = bestByUser.entrySet().stream()
                .map(e -> {
                    ExerciseSet s = e.getValue();
                    BigDecimal score = s.getWeightLbs().multiply(BigDecimal.valueOf(s.getReps()));
                    return new LeaderboardDTO.Entry(
                            0,
                            userIdToName.getOrDefault(e.getKey(), "unknown"),
                            score,
                            s.getWeightLbs(),
                            s.getReps(),
                            null,
                            null,
                            s.getSession().getSessionDate()
                    );
                })
                .sorted(Comparator
                        .comparing(LeaderboardDTO.Entry::getBestWeight, Comparator.reverseOrder())
                        .thenComparing(LeaderboardDTO.Entry::getBestReps, Comparator.reverseOrder())
                        .thenComparing(LeaderboardDTO.Entry::getAchievedDate))
                .limit(TOP_N_PER_EXERCISE)
                .collect(Collectors.toList());

        for (int i = 0; i < entries.size(); i++) entries.get(i).setRank(i + 1);
        return entries;
    }

    private List<LeaderboardDTO.Entry> cardioEntries(List<ExerciseSet> sets, Map<Long, String> userIdToName) {
        // Per user: sum total distance + duration.
        Map<Long, BigDecimal> totalDist = new HashMap<>();
        Map<Long, Integer>    totalDur  = new HashMap<>();
        Map<Long, LocalDate>  lastDate  = new HashMap<>();

        for (ExerciseSet s : sets) {
            Long uid = s.getSession().getUser().getId();
            if (s.getDistanceMiles() != null) {
                totalDist.merge(uid, s.getDistanceMiles(), BigDecimal::add);
            }
            if (s.getDurationSeconds() != null) {
                totalDur.merge(uid, s.getDurationSeconds(), Integer::sum);
            }
            LocalDate d = s.getSession().getSessionDate();
            lastDate.merge(uid, d, (a, b) -> a.isAfter(b) ? a : b);
        }

        Set<Long> users = new HashSet<>();
        users.addAll(totalDist.keySet());
        users.addAll(totalDur.keySet());

        List<LeaderboardDTO.Entry> entries = users.stream()
                .map(uid -> {
                    BigDecimal dist = totalDist.getOrDefault(uid, BigDecimal.ZERO);
                    Integer    dur  = totalDur.getOrDefault(uid, 0);
                    return new LeaderboardDTO.Entry(
                            0,
                            userIdToName.getOrDefault(uid, "unknown"),
                            dist,           // use distance as score
                            null,
                            null,
                            dist,
                            dur,
                            lastDate.get(uid)
                    );
                })
                .sorted(Comparator
                        .comparing(LeaderboardDTO.Entry::getTotalDistance, Comparator.reverseOrder())
                        .thenComparing(LeaderboardDTO.Entry::getAchievedDate))
                .limit(TOP_N_PER_EXERCISE)
                .collect(Collectors.toList());

        for (int i = 0; i < entries.size(); i++) entries.get(i).setRank(i + 1);
        return entries;
    }

    private List<LeaderboardDTO.TopUser> buildTopLifters(List<ExerciseSet> sets, Map<Long, String> userIdToName) {
        Map<Long, BigDecimal> volume   = new HashMap<>();
        Map<Long, Integer>    setCount = new HashMap<>();
        Map<Long, Set<Long>>  sessions = new HashMap<>();

        for (ExerciseSet s : sets) {
            Long uid = s.getSession().getUser().getId();
            setCount.merge(uid, 1, Integer::sum);
            sessions.computeIfAbsent(uid, k -> new HashSet<>()).add(s.getSession().getId());

            // Only count strength volume.
            if (s.getDistanceMiles() == null && s.getDurationSeconds() == null
                    && s.getReps() != null && s.getWeightLbs() != null) {
                BigDecimal v = s.getWeightLbs().multiply(BigDecimal.valueOf(s.getReps()));
                volume.merge(uid, v, BigDecimal::add);
            }
        }

        List<LeaderboardDTO.TopUser> list = userIdToName.keySet().stream()
                .filter(setCount::containsKey)
                .map(uid -> new LeaderboardDTO.TopUser(
                        0,
                        userIdToName.get(uid),
                        sessions.getOrDefault(uid, Set.of()).size(),
                        setCount.getOrDefault(uid, 0),
                        volume.getOrDefault(uid, BigDecimal.ZERO)
                ))
                .sorted(Comparator
                        .comparing(LeaderboardDTO.TopUser::getTotalVolumeLbs, Comparator.reverseOrder())
                        .thenComparingInt((LeaderboardDTO.TopUser u) -> -u.getTotalSets()))
                .limit(TOP_N_LIFTERS)
                .collect(Collectors.toList());

        for (int i = 0; i < list.size(); i++) list.get(i).setRank(i + 1);
        return list;
    }

    private List<LeaderboardDTO.ActivityPoint> buildActivity(List<ExerciseSet> sets) {
        if (sets.isEmpty()) return List.of();

        LocalDate latest = sets.stream()
                .map(s -> s.getSession().getSessionDate())
                .max(Comparator.naturalOrder())
                .orElse(LocalDate.now());
        LocalDate cutoff = latest.minusDays(ACTIVITY_DAYS - 1);

        Map<LocalDate, Set<Long>>  sessionsPerDay = new TreeMap<>();
        Map<LocalDate, Integer>    setsPerDay     = new TreeMap<>();

        for (ExerciseSet s : sets) {
            LocalDate d = s.getSession().getSessionDate();
            if (d.isBefore(cutoff)) continue;
            sessionsPerDay.computeIfAbsent(d, k -> new HashSet<>()).add(s.getSession().getId());
            setsPerDay.merge(d, 1, Integer::sum);
        }

        List<LeaderboardDTO.ActivityPoint> points = new ArrayList<>();
        for (LocalDate d = cutoff; !d.isAfter(latest); d = d.plusDays(1)) {
            points.add(new LeaderboardDTO.ActivityPoint(
                    d,
                    sessionsPerDay.getOrDefault(d, Set.of()).size(),
                    setsPerDay.getOrDefault(d, 0)
            ));
        }
        return points;
    }

    /** Ranks a set: heavier weight first, then more reps, then earliest date. */
    private static Comparator<ExerciseSet> setComparator() {
        return Comparator
                .comparing(ExerciseSet::getWeightLbs, Comparator.reverseOrder())
                .thenComparing(ExerciseSet::getReps, Comparator.reverseOrder())
                .thenComparing((ExerciseSet s) -> s.getSession().getSessionDate());
    }
}
