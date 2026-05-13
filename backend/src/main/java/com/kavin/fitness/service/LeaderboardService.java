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
    //     Fastest Mile, Fastest 5K, Fastest 10K, Fastest Half Marathon
    //         - For each user, take the best (lowest) pace among runs that covered
    //           at least the threshold distance; equivalent category time = pace × threshold.
    //     Longest Run     - Max single-run distance per user.
    //     Total Distance  - Sum of all run distances per user.
    //     Total Runs      - Count of run sessions per user.

    private static final BigDecimal MILE_DISTANCE       = new BigDecimal("1.0");
    private static final BigDecimal FIVE_K_DISTANCE     = new BigDecimal("3.10686");
    private static final BigDecimal TEN_K_DISTANCE      = new BigDecimal("6.21371");
    private static final BigDecimal HALF_MAR_DISTANCE   = new BigDecimal("13.10940");

    private List<LeaderboardDTO.ExerciseLeaderboard> buildRunningCategories(
            List<ExerciseSet> runSets, Map<Long, String> userIdToName) {

        if (runSets.isEmpty()) return List.of();

        List<LeaderboardDTO.ExerciseLeaderboard> result = new ArrayList<>();
        result.add(buildFastestCategory("Fastest Mile",           MILE_DISTANCE,     runSets, userIdToName));
        result.add(buildFastestCategory("Fastest 5K",             FIVE_K_DISTANCE,   runSets, userIdToName));
        result.add(buildFastestCategory("Fastest 10K",            TEN_K_DISTANCE,    runSets, userIdToName));
        result.add(buildFastestCategory("Fastest Half Marathon",  HALF_MAR_DISTANCE, runSets, userIdToName));
        result.add(buildLongestRun(runSets,    userIdToName));
        result.add(buildTotalDistance(runSets, userIdToName));
        result.add(buildTotalRuns(runSets,     userIdToName));

        // Drop empty boards so users only see categories with data.
        result.removeIf(b -> b.getEntries().isEmpty());
        return result;
    }

    /** Best-pace category: per user, find run with distance ≥ threshold and best (lowest) pace. */
    private LeaderboardDTO.ExerciseLeaderboard buildFastestCategory(
            String label,
            BigDecimal thresholdMiles,
            List<ExerciseSet> runSets,
            Map<Long, String> userIdToName) {

        // Per user: pick the set with min pace (sec/mile) among sets that cover at least the threshold.
        Map<Long, ExerciseSet> bestByUser = new HashMap<>();
        Map<Long, BigDecimal>  bestPace   = new HashMap<>();

        for (ExerciseSet s : runSets) {
            if (s.getDurationSeconds() == null || s.getDurationSeconds() <= 0) continue;
            if (s.getDistanceMiles().compareTo(thresholdMiles) < 0) continue;

            BigDecimal pace = BigDecimal.valueOf(s.getDurationSeconds())
                    .divide(s.getDistanceMiles(), 4, RoundingMode.HALF_UP);

            Long uid = s.getSession().getUser().getId();
            BigDecimal current = bestPace.get(uid);
            if (current == null || pace.compareTo(current) < 0) {
                bestPace.put(uid, pace);
                bestByUser.put(uid, s);
            }
        }

        Set<Long> participants = new HashSet<>(bestByUser.keySet());
        int totalSets = (int) runSets.stream()
                .filter(s -> s.getDurationSeconds() != null && s.getDurationSeconds() > 0
                        && s.getDistanceMiles().compareTo(thresholdMiles) >= 0)
                .count();

        List<LeaderboardDTO.Entry> entries = bestByUser.entrySet().stream()
                .map(e -> {
                    Long uid = e.getKey();
                    ExerciseSet s = e.getValue();
                    BigDecimal pace = bestPace.get(uid);
                    // Equivalent category time = pace × threshold (seconds).
                    int categoryTimeSec = pace.multiply(thresholdMiles).setScale(0, RoundingMode.HALF_UP).intValue();
                    return new LeaderboardDTO.Entry(
                            0,
                            userIdToName.getOrDefault(uid, "unknown"),
                            BigDecimal.valueOf(categoryTimeSec),
                            null, null,
                            thresholdMiles,
                            categoryTimeSec,
                            s.getSession().getSessionDate()
                    );
                })
                .sorted(Comparator
                        .comparing(LeaderboardDTO.Entry::getTotalDurationSeconds)
                        .thenComparing(LeaderboardDTO.Entry::getAchievedDate))
                .limit(TOP_N_PER_EXERCISE)
                .collect(Collectors.toList());

        for (int i = 0; i < entries.size(); i++) entries.get(i).setRank(i + 1);

        return new LeaderboardDTO.ExerciseLeaderboard(
                label, "cardio", "time", totalSets, participants.size(), entries);
    }

    /** Longest single run per user. */
    private LeaderboardDTO.ExerciseLeaderboard buildLongestRun(
            List<ExerciseSet> runSets, Map<Long, String> userIdToName) {

        Map<Long, ExerciseSet> bestByUser = new HashMap<>();
        for (ExerciseSet s : runSets) {
            Long uid = s.getSession().getUser().getId();
            ExerciseSet current = bestByUser.get(uid);
            if (current == null || s.getDistanceMiles().compareTo(current.getDistanceMiles()) > 0) {
                bestByUser.put(uid, s);
            }
        }

        List<LeaderboardDTO.Entry> entries = bestByUser.entrySet().stream()
                .map(e -> {
                    Long uid = e.getKey();
                    ExerciseSet s = e.getValue();
                    return new LeaderboardDTO.Entry(
                            0,
                            userIdToName.getOrDefault(uid, "unknown"),
                            s.getDistanceMiles(),
                            null, null,
                            s.getDistanceMiles(),
                            s.getDurationSeconds(),
                            s.getSession().getSessionDate()
                    );
                })
                .sorted(Comparator
                        .comparing(LeaderboardDTO.Entry::getTotalDistance, Comparator.reverseOrder())
                        .thenComparing(LeaderboardDTO.Entry::getAchievedDate))
                .limit(TOP_N_PER_EXERCISE)
                .collect(Collectors.toList());

        for (int i = 0; i < entries.size(); i++) entries.get(i).setRank(i + 1);

        return new LeaderboardDTO.ExerciseLeaderboard(
                "Longest Run", "cardio", "distance", runSets.size(), bestByUser.size(), entries);
    }

    /** Total distance per user across all runs. */
    private LeaderboardDTO.ExerciseLeaderboard buildTotalDistance(
            List<ExerciseSet> runSets, Map<Long, String> userIdToName) {

        Map<Long, BigDecimal> totalDist = new HashMap<>();
        Map<Long, LocalDate>  lastDate  = new HashMap<>();
        Map<Long, Integer>    totalDur  = new HashMap<>();

        for (ExerciseSet s : runSets) {
            Long uid = s.getSession().getUser().getId();
            totalDist.merge(uid, s.getDistanceMiles(), BigDecimal::add);
            if (s.getDurationSeconds() != null) totalDur.merge(uid, s.getDurationSeconds(), Integer::sum);
            LocalDate d = s.getSession().getSessionDate();
            lastDate.merge(uid, d, (a, b) -> a.isAfter(b) ? a : b);
        }

        List<LeaderboardDTO.Entry> entries = totalDist.entrySet().stream()
                .map(e -> new LeaderboardDTO.Entry(
                        0,
                        userIdToName.getOrDefault(e.getKey(), "unknown"),
                        e.getValue(),
                        null, null,
                        e.getValue(),
                        totalDur.getOrDefault(e.getKey(), 0),
                        lastDate.get(e.getKey())
                ))
                .sorted(Comparator
                        .comparing(LeaderboardDTO.Entry::getTotalDistance, Comparator.reverseOrder())
                        .thenComparing(LeaderboardDTO.Entry::getAchievedDate))
                .limit(TOP_N_PER_EXERCISE)
                .collect(Collectors.toList());

        for (int i = 0; i < entries.size(); i++) entries.get(i).setRank(i + 1);

        return new LeaderboardDTO.ExerciseLeaderboard(
                "Total Distance", "cardio", "distance", runSets.size(), totalDist.size(), entries);
    }

    /** Total run sessions per user. */
    private LeaderboardDTO.ExerciseLeaderboard buildTotalRuns(
            List<ExerciseSet> runSets, Map<Long, String> userIdToName) {

        Map<Long, Set<Long>> sessionsByUser = new HashMap<>();
        Map<Long, LocalDate> lastDate       = new HashMap<>();

        for (ExerciseSet s : runSets) {
            Long uid = s.getSession().getUser().getId();
            sessionsByUser.computeIfAbsent(uid, k -> new HashSet<>()).add(s.getSession().getId());
            lastDate.merge(uid, s.getSession().getSessionDate(),
                    (a, b) -> a.isAfter(b) ? a : b);
        }

        List<LeaderboardDTO.Entry> entries = sessionsByUser.entrySet().stream()
                .map(e -> new LeaderboardDTO.Entry(
                        0,
                        userIdToName.getOrDefault(e.getKey(), "unknown"),
                        BigDecimal.valueOf(e.getValue().size()),
                        null, e.getValue().size(),  // store count in bestReps for frontend display
                        null, null,
                        lastDate.get(e.getKey())
                ))
                .sorted(Comparator
                        .comparing((LeaderboardDTO.Entry en) -> en.getBestReps(), Comparator.reverseOrder())
                        .thenComparing(LeaderboardDTO.Entry::getAchievedDate))
                .limit(TOP_N_PER_EXERCISE)
                .collect(Collectors.toList());

        for (int i = 0; i < entries.size(); i++) entries.get(i).setRank(i + 1);

        return new LeaderboardDTO.ExerciseLeaderboard(
                "Total Runs", "cardio", "count", runSets.size(), sessionsByUser.size(), entries);
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
