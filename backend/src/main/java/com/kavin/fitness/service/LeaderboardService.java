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
import java.math.RoundingMode;
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

        List<LeaderboardDTO.ExerciseLeaderboard> result = new ArrayList<>();

        // Strength: every exercise grouping that has at least one weighted set (no distance, no duration).
        Map<String, List<ExerciseSet>> byExercise = sets.stream()
                .collect(Collectors.groupingBy(ExerciseSet::getExerciseName));

        for (Map.Entry<String, List<ExerciseSet>> entry : byExercise.entrySet()) {
            String name = entry.getKey();
            List<ExerciseSet> exSets = entry.getValue();

            // Filter to strength-style sets only.
            List<ExerciseSet> strengthSets = exSets.stream()
                    .filter(s -> s.getDistanceMiles() == null && s.getDurationSeconds() == null)
                    .collect(Collectors.toList());
            if (strengthSets.isEmpty()) continue;

            List<LeaderboardDTO.Entry> entries = strengthEntries(strengthSets, userIdToName);

            Set<Long> participants = new HashSet<>();
            for (ExerciseSet s : strengthSets) participants.add(s.getSession().getUser().getId());

            result.add(new LeaderboardDTO.ExerciseLeaderboard(
                    name,
                    "strength",
                    "weight",
                    strengthSets.size(),
                    participants.size(),
                    entries
            ));
        }

        result.sort(Comparator.comparingInt(LeaderboardDTO.ExerciseLeaderboard::getTotalSets).reversed()
                .thenComparing(LeaderboardDTO.ExerciseLeaderboard::getExerciseName));

        // Cardio: only runs. Build fixed-category leaderboards.
        List<ExerciseSet> runSets = sets.stream()
                .filter(s -> isRunning(s.getExerciseName()))
                .filter(s -> s.getDistanceMiles() != null)
                .collect(Collectors.toList());

        result.addAll(buildRunningCategories(runSets, userIdToName));

        return result;
    }

    private static boolean isRunning(String name) {
        if (name == null) return false;
        String n = name.trim().toLowerCase();
        return n.equals("running") || n.equals("run");
    }

    private List<LeaderboardDTO.Entry> strengthEntries(List<ExerciseSet> sets, Map<Long, String> userIdToName) {
        // Per user: pick the best single set ranked by weight then reps.
        Map<Long, ExerciseSet> bestByUser = new HashMap<>();
        for (ExerciseSet s : sets) {
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

    // ── Cardio category leaderboards (Running only) ─────────────────────────
    //
    //   Categories:
    //     Longest Run Time  - Longest single-run duration per user (most time in one run).
    //     Fastest Avg Pace  - Best lifetime average pace (totalDuration / totalDistance) per user.

    private List<LeaderboardDTO.ExerciseLeaderboard> buildRunningCategories(
            List<ExerciseSet> runSets, Map<Long, String> userIdToName) {

        if (runSets.isEmpty()) return List.of();

        List<LeaderboardDTO.ExerciseLeaderboard> result = new ArrayList<>();
        result.add(buildLongestRunTime(runSets, userIdToName));
        result.add(buildFastestAvgPace(runSets, userIdToName));

        result.removeIf(b -> b.getEntries().isEmpty());
        return result;
    }

    /** Longest single-run duration per user (longest mile-time = most time spent running in one go). */
    private LeaderboardDTO.ExerciseLeaderboard buildLongestRunTime(
            List<ExerciseSet> runSets, Map<Long, String> userIdToName) {

        Map<Long, ExerciseSet> bestByUser = new HashMap<>();
        for (ExerciseSet s : runSets) {
            if (s.getDurationSeconds() == null || s.getDurationSeconds() <= 0) continue;
            Long uid = s.getSession().getUser().getId();
            ExerciseSet current = bestByUser.get(uid);
            if (current == null || s.getDurationSeconds() > current.getDurationSeconds()) {
                bestByUser.put(uid, s);
            }
        }

        List<LeaderboardDTO.Entry> entries = bestByUser.entrySet().stream()
                .map(e -> {
                    ExerciseSet s = e.getValue();
                    return new LeaderboardDTO.Entry(
                            0,
                            userIdToName.getOrDefault(e.getKey(), "unknown"),
                            BigDecimal.valueOf(s.getDurationSeconds()),
                            null, null,
                            s.getDistanceMiles(),
                            s.getDurationSeconds(),
                            s.getSession().getSessionDate()
                    );
                })
                .sorted(Comparator
                        .comparing(LeaderboardDTO.Entry::getTotalDurationSeconds, Comparator.reverseOrder())
                        .thenComparing(LeaderboardDTO.Entry::getAchievedDate))
                .limit(TOP_N_PER_EXERCISE)
                .collect(Collectors.toList());

        for (int i = 0; i < entries.size(); i++) entries.get(i).setRank(i + 1);

        return new LeaderboardDTO.ExerciseLeaderboard(
                "Longest Run Time", "cardio", "time", runSets.size(), bestByUser.size(), entries);
    }

    /** Lifetime average pace per user: totalDuration / totalDistance (lower = better). */
    private LeaderboardDTO.ExerciseLeaderboard buildFastestAvgPace(
            List<ExerciseSet> runSets, Map<Long, String> userIdToName) {

        Map<Long, BigDecimal> totalDist = new HashMap<>();
        Map<Long, Integer>    totalDur  = new HashMap<>();
        Map<Long, LocalDate>  lastDate  = new HashMap<>();

        for (ExerciseSet s : runSets) {
            if (s.getDurationSeconds() == null || s.getDurationSeconds() <= 0) continue;
            if (s.getDistanceMiles().compareTo(BigDecimal.ZERO) <= 0) continue;
            Long uid = s.getSession().getUser().getId();
            totalDist.merge(uid, s.getDistanceMiles(), BigDecimal::add);
            totalDur.merge(uid, s.getDurationSeconds(), Integer::sum);
            lastDate.merge(uid, s.getSession().getSessionDate(),
                    (a, b) -> a.isAfter(b) ? a : b);
        }

        List<LeaderboardDTO.Entry> entries = totalDist.entrySet().stream()
                .map(e -> {
                    Long uid = e.getKey();
                    BigDecimal dist = e.getValue();
                    Integer    dur  = totalDur.getOrDefault(uid, 0);
                    // Pace as sec/mile, rounded to 1 decimal for ranking stability.
                    BigDecimal pace = BigDecimal.valueOf(dur).divide(dist, 4, RoundingMode.HALF_UP);
                    return new LeaderboardDTO.Entry(
                            0,
                            userIdToName.getOrDefault(uid, "unknown"),
                            pace,
                            null, null,
                            dist,
                            dur,
                            lastDate.get(uid)
                    );
                })
                .sorted(Comparator
                        .comparing(LeaderboardDTO.Entry::getScore)
                        .thenComparing(LeaderboardDTO.Entry::getAchievedDate))
                .limit(TOP_N_PER_EXERCISE)
                .collect(Collectors.toList());

        for (int i = 0; i < entries.size(); i++) entries.get(i).setRank(i + 1);

        return new LeaderboardDTO.ExerciseLeaderboard(
                "Fastest Avg Pace", "cardio", "pace", runSets.size(), totalDist.size(), entries);
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
