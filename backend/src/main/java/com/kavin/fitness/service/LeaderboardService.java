package com.kavin.fitness.service;

import com.kavin.fitness.dto.LeaderboardDTO;
import com.kavin.fitness.model.ExerciseSet;
import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.ExerciseSetRepository;
import com.kavin.fitness.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class LeaderboardService {

    private static final int TOP_N_PER_EXERCISE = 10;
    private static final int TOP_N_ACTIVE = 5;
    private static final int ACTIVITY_DAYS = 30;
    private static final int CHANGE_WINDOW_DAYS = 7;

    private final UserRepository userRepository;
    private final ExerciseSetRepository exerciseSetRepository;

    /**
     * Strength leaderboards built only from users who opted in.
     *
     * @param period "all" for all time; anything else means the current calendar month
     * @param viewer the signed-in viewer's username, or null when anonymous
     */
    public LeaderboardDTO getLeaderboard(String period, String viewer) {
        return getLeaderboard(period, viewer, LocalDate.now());
    }

    LeaderboardDTO getLeaderboard(String period, String viewer, LocalDate today) {
        LocalDate start = "all".equals(period) ? null : today.withDayOfMonth(1);

        List<User> sharers = userRepository.findByShareDataTrue();
        boolean viewerShares =
                viewer != null && sharers.stream().anyMatch(u -> u.getUsername().equals(viewer));
        if (sharers.isEmpty()) {
            return new LeaderboardDTO(
                    0, 0, 0, 0, List.of(), List.of(), List.of(), notSharing(viewer));
        }

        Map<Long, String> userIdToName =
                sharers.stream().collect(Collectors.toMap(User::getId, User::getUsername));
        List<ExerciseSet> sets =
                exerciseSetRepository.findByUserIdIn(new ArrayList<>(userIdToName.keySet()));

        List<ExerciseSet> periodSets =
                sets.stream().filter(s -> start == null || !date(s).isBefore(start)).toList();
        Set<Long> sessionIds = new HashSet<>();
        for (ExerciseSet s : periodSets) sessionIds.add(s.getSession().getId());

        List<LeaderboardDTO.ExerciseLeaderboard> exercises = new ArrayList<>();
        List<LeaderboardDTO.Standing> standings = new ArrayList<>();
        buildBoards(
                periodSets,
                today,
                userIdToName,
                viewerShares ? viewer : null,
                exercises,
                standings);

        LeaderboardDTO.Me me =
                viewer == null
                        ? null
                        : viewerShares
                                ? new LeaderboardDTO.Me(true, standings)
                                : notSharing(viewer);

        return new LeaderboardDTO(
                sharers.size(),
                sessionIds.size(),
                periodSets.size(),
                countPrs(sets, start),
                exercises,
                buildMostActive(periodSets, userIdToName),
                buildActivity(sets, today),
                me);
    }

    private LeaderboardDTO.Me notSharing(String viewer) {
        return viewer == null ? null : new LeaderboardDTO.Me(false, List.of());
    }

    private static LocalDate date(ExerciseSet s) {
        return s.getSession().getSessionDate();
    }

    private static boolean isStrength(ExerciseSet s) {
        return !s.isCardio();
    }

    /** One board per strength exercise, busiest first, plus the viewer's standing on each. */
    private void buildBoards(
            List<ExerciseSet> periodSets,
            LocalDate today,
            Map<Long, String> userIdToName,
            String viewer,
            List<LeaderboardDTO.ExerciseLeaderboard> exercises,
            List<LeaderboardDTO.Standing> standings) {

        Map<String, List<ExerciseSet>> byExercise =
                periodSets.stream()
                        .filter(LeaderboardService::isStrength)
                        .collect(Collectors.groupingBy(ExerciseSet::getExerciseName));
        LocalDate weekAgo = today.minusDays(CHANGE_WINDOW_DAYS);

        for (Map.Entry<String, List<ExerciseSet>> e : byExercise.entrySet()) {
            List<LeaderboardDTO.Entry> ranked = rank(e.getValue(), userIdToName);
            Map<String, Integer> previous = new HashMap<>();
            for (LeaderboardDTO.Entry old :
                    rank(
                            e.getValue().stream().filter(s -> !date(s).isAfter(weekAgo)).toList(),
                            userIdToName)) {
                previous.put(old.getUsername(), old.getRank());
            }
            for (LeaderboardDTO.Entry entry : ranked) {
                Integer was = previous.get(entry.getUsername());
                entry.setChange(was == null ? null : was - entry.getRank());
            }

            exercises.add(
                    new LeaderboardDTO.ExerciseLeaderboard(
                            e.getKey(),
                            e.getValue().size(),
                            ranked.size(),
                            ranked.stream().limit(TOP_N_PER_EXERCISE).toList()));

            if (viewer == null) continue;
            for (LeaderboardDTO.Entry mine : ranked) {
                if (!mine.getUsername().equals(viewer)) continue;
                standings.add(
                        new LeaderboardDTO.Standing(
                                e.getKey(),
                                mine.getRank(),
                                ranked.size(),
                                mine.getBestWeight(),
                                mine.getBestReps(),
                                mine.getAchievedDate(),
                                mine.getChange(),
                                mine.getRank() > 1 ? ranked.get(mine.getRank() - 2) : null));
            }
        }

        exercises.sort(
                Comparator.comparingInt(LeaderboardDTO.ExerciseLeaderboard::getTotalSets)
                        .reversed()
                        .thenComparing(LeaderboardDTO.ExerciseLeaderboard::getExerciseName));
        List<String> order =
                exercises.stream()
                        .map(LeaderboardDTO.ExerciseLeaderboard::getExerciseName)
                        .toList();
        standings.sort(Comparator.comparingInt(s -> order.indexOf(s.getExerciseName())));
    }

    /** Every lifter's best set (heavier, then more reps, then earlier), ranked from 1. */
    private List<LeaderboardDTO.Entry> rank(
            List<ExerciseSet> sets, Map<Long, String> userIdToName) {
        Map<Long, ExerciseSet> bestByUser = new HashMap<>();
        for (ExerciseSet s : sets) {
            Long uid = s.getSession().getUser().getId();
            ExerciseSet current = bestByUser.get(uid);
            if (current == null || setComparator().compare(s, current) < 0) {
                bestByUser.put(uid, s);
            }
        }

        List<Map.Entry<Long, ExerciseSet>> best = new ArrayList<>(bestByUser.entrySet());
        best.sort(Map.Entry.comparingByValue(setComparator()));

        List<LeaderboardDTO.Entry> entries = new ArrayList<>();
        for (Map.Entry<Long, ExerciseSet> e : best) {
            ExerciseSet s = e.getValue();
            entries.add(
                    new LeaderboardDTO.Entry(
                            entries.size() + 1,
                            userIdToName.getOrDefault(e.getKey(), "unknown"),
                            s.getWeightLbs(),
                            s.getReps(),
                            date(s),
                            null));
        }
        return entries;
    }

    /**
     * A PR is a strength set heavier than everything the lifter logged for that exercise on earlier
     * days. A lifter's first ever set of an exercise doesn't count, and one exercise counts at most
     * once per day.
     */
    private int countPrs(List<ExerciseSet> sets, LocalDate start) {
        Map<Long, Map<String, List<ExerciseSet>>> byUserAndExercise = new HashMap<>();
        for (ExerciseSet s : sets) {
            if (!isStrength(s)) continue;
            byUserAndExercise
                    .computeIfAbsent(s.getSession().getUser().getId(), k -> new HashMap<>())
                    .computeIfAbsent(s.getExerciseName(), k -> new ArrayList<>())
                    .add(s);
        }

        int count = 0;
        for (Map<String, List<ExerciseSet>> exercises : byUserAndExercise.values()) {
            for (List<ExerciseSet> list : exercises.values()) {
                TreeMap<LocalDate, BigDecimal> heaviestByDay = new TreeMap<>();
                for (ExerciseSet s : list)
                    heaviestByDay.merge(date(s), s.getWeightLbs(), BigDecimal::max);

                BigDecimal best = null;
                for (Map.Entry<LocalDate, BigDecimal> day : heaviestByDay.entrySet()) {
                    boolean inPeriod = start == null || !day.getKey().isBefore(start);
                    if (best != null && day.getValue().compareTo(best) > 0 && inPeriod) count++;
                    if (best == null || day.getValue().compareTo(best) > 0) best = day.getValue();
                }
            }
        }
        return count;
    }

    private List<LeaderboardDTO.ActiveUser> buildMostActive(
            List<ExerciseSet> periodSets, Map<Long, String> userIdToName) {
        Map<Long, Set<Long>> sessions = new HashMap<>();
        Map<Long, Integer> setCount = new HashMap<>();
        for (ExerciseSet s : periodSets) {
            Long uid = s.getSession().getUser().getId();
            sessions.computeIfAbsent(uid, k -> new HashSet<>()).add(s.getSession().getId());
            setCount.merge(uid, 1, Integer::sum);
        }

        List<LeaderboardDTO.ActiveUser> list =
                sessions.keySet().stream()
                        .map(
                                uid ->
                                        new LeaderboardDTO.ActiveUser(
                                                0,
                                                userIdToName.get(uid),
                                                sessions.get(uid).size(),
                                                setCount.get(uid)))
                        .sorted(
                                Comparator.comparingInt(LeaderboardDTO.ActiveUser::getSessionCount)
                                        .reversed()
                                        .thenComparing(
                                                Comparator.comparingInt(
                                                                LeaderboardDTO.ActiveUser
                                                                        ::getTotalSets)
                                                        .reversed())
                                        .thenComparing(LeaderboardDTO.ActiveUser::getUsername))
                        .limit(TOP_N_ACTIVE)
                        .collect(Collectors.toList());

        for (int i = 0; i < list.size(); i++) list.get(i).setRank(i + 1);
        return list;
    }

    private List<LeaderboardDTO.ActivityPoint> buildActivity(
            List<ExerciseSet> sets, LocalDate today) {
        LocalDate cutoff = today.minusDays(ACTIVITY_DAYS - 1);

        Map<LocalDate, Set<Long>> sessionsPerDay = new HashMap<>();
        Map<LocalDate, Integer> setsPerDay = new HashMap<>();
        for (ExerciseSet s : sets) {
            LocalDate d = date(s);
            if (d.isBefore(cutoff) || d.isAfter(today)) continue;
            sessionsPerDay.computeIfAbsent(d, k -> new HashSet<>()).add(s.getSession().getId());
            setsPerDay.merge(d, 1, Integer::sum);
        }

        List<LeaderboardDTO.ActivityPoint> points = new ArrayList<>();
        for (LocalDate d = cutoff; !d.isAfter(today); d = d.plusDays(1)) {
            points.add(
                    new LeaderboardDTO.ActivityPoint(
                            d,
                            sessionsPerDay.getOrDefault(d, Set.of()).size(),
                            setsPerDay.getOrDefault(d, 0)));
        }
        return points;
    }

    /** Ranks a set: heavier weight first, then more reps, then earliest date. */
    private static Comparator<ExerciseSet> setComparator() {
        return Comparator.comparing(ExerciseSet::getWeightLbs, Comparator.reverseOrder())
                .thenComparing(ExerciseSet::getReps, Comparator.reverseOrder())
                .thenComparing(LeaderboardService::date);
    }
}
