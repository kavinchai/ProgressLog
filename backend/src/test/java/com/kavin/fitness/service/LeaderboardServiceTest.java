package com.kavin.fitness.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

import com.kavin.fitness.dto.LeaderboardDTO;
import com.kavin.fitness.model.ExerciseSet;
import com.kavin.fitness.model.User;
import com.kavin.fitness.model.WorkoutSession;
import com.kavin.fitness.repository.ExerciseSetRepository;
import com.kavin.fitness.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class LeaderboardServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 29);

    @Mock UserRepository userRepository;
    @Mock ExerciseSetRepository exerciseSetRepository;
    @InjectMocks LeaderboardService leaderboardService;

    private long nextSessionId = 1;

    // ── helpers ──────────────────────────────────────────────────────────────

    private static User user(long id, String name, boolean share) {
        User u = new User();
        u.setUsername(name);
        u.setShareData(share);
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }

    private WorkoutSession session(User u, LocalDate date) {
        WorkoutSession s = new WorkoutSession();
        s.setUser(u);
        s.setSessionDate(date);
        ReflectionTestUtils.setField(s, "id", nextSessionId++);
        return s;
    }

    private static ExerciseSet set(WorkoutSession s, String name, String weight, int reps) {
        ExerciseSet e = new ExerciseSet();
        e.setSession(s);
        e.setExerciseName(name);
        e.setSetNumber(1);
        e.setReps(reps);
        e.setWeightLbs(new BigDecimal(weight));
        return e;
    }

    private ExerciseSet lift(User u, LocalDate date, String name, String weight, int reps) {
        return set(session(u, date), name, weight, reps);
    }

    private void givenSharers(List<User> sharers, List<ExerciseSet> sets) {
        when(userRepository.findByShareDataTrue()).thenReturn(sharers);
        when(exerciseSetRepository.findByUserIdIn(anyList())).thenReturn(sets);
    }

    private static LeaderboardDTO.ExerciseLeaderboard board(LeaderboardDTO dto, String name) {
        return dto.getExercises().stream()
                .filter(b -> b.getExerciseName().equals(name))
                .findFirst()
                .orElseThrow();
    }

    // ── tests ────────────────────────────────────────────────────────────────

    @Test
    void noSharers_returnsEmptyBoardAndNoMeForAnonymousViewer() {
        when(userRepository.findByShareDataTrue()).thenReturn(List.of());

        LeaderboardDTO dto = leaderboardService.getLeaderboard("month", null, TODAY);

        assertEquals(0, dto.getTotalUsers());
        assertTrue(dto.getExercises().isEmpty());
        assertTrue(dto.getMostActive().isEmpty());
        assertNull(dto.getMe());
    }

    @Test
    void noSharers_signedInViewerIsToldTheyAreNotSharing() {
        when(userRepository.findByShareDataTrue()).thenReturn(List.of());

        LeaderboardDTO.Me me = leaderboardService.getLeaderboard("month", "kavin", TODAY).getMe();

        assertFalse(me.isSharing());
        assertTrue(me.getStandings().isEmpty());
    }

    @Test
    void monthPeriod_onlyCountsSetsFromThisMonth_allTimeCountsEverything() {
        User a = user(1, "alice", true);
        givenSharers(
                List.of(a),
                List.of(
                        lift(a, LocalDate.of(2026, 9, 20), "Bench Press", "200", 5),
                        lift(a, LocalDate.of(2026, 10, 3), "Bench Press", "185", 5)));

        LeaderboardDTO month = leaderboardService.getLeaderboard("month", null, TODAY);
        LeaderboardDTO all = leaderboardService.getLeaderboard("all", null, TODAY);

        assertEquals(1, month.getTotalSets());
        assertEquals(
                0,
                new BigDecimal("185")
                        .compareTo(
                                board(month, "Bench Press").getEntries().get(0).getBestWeight()));
        assertEquals(2, all.getTotalSets());
        assertEquals(
                0,
                new BigDecimal("200")
                        .compareTo(board(all, "Bench Press").getEntries().get(0).getBestWeight()));
    }

    @Test
    void boards_rankByWeightThenReps_keepTopTen_butCountEveryParticipant() {
        List<User> users = new ArrayList<>();
        List<ExerciseSet> sets = new ArrayList<>();
        for (int i = 1; i <= 12; i++) {
            User u = user(i, "u" + i, true);
            users.add(u);
            sets.add(lift(u, TODAY.minusDays(1), "Squats", String.valueOf(100 + i * 10), 5));
        }
        // Same weight as u12 (220) with more reps ranks first.
        User top = user(13, "top", true);
        users.add(top);
        sets.add(lift(top, TODAY.minusDays(1), "Squats", "220", 6));
        givenSharers(users, sets);

        LeaderboardDTO.ExerciseLeaderboard squats =
                board(leaderboardService.getLeaderboard("month", null, TODAY), "Squats");

        assertEquals(13, squats.getParticipantCount());
        assertEquals(10, squats.getEntries().size());
        assertEquals("top", squats.getEntries().get(0).getUsername());
        assertEquals("u12", squats.getEntries().get(1).getUsername());
        assertEquals(1, squats.getEntries().get(0).getRank());
    }

    @Test
    void entries_reportRankChangeSinceAWeekAgo() {
        User a = user(1, "alice", true);
        User b = user(2, "bob", true);
        User c = user(3, "cara", true);
        givenSharers(
                List.of(a, b, c),
                List.of(
                        lift(a, LocalDate.of(2026, 10, 10), "Bench Press", "200", 5),
                        lift(b, LocalDate.of(2026, 10, 11), "Bench Press", "190", 5),
                        lift(b, TODAY.minusDays(2), "Bench Press", "210", 3),
                        lift(c, TODAY.minusDays(1), "Bench Press", "150", 5)));

        List<LeaderboardDTO.Entry> entries =
                board(leaderboardService.getLeaderboard("month", null, TODAY), "Bench Press")
                        .getEntries();

        assertEquals("bob", entries.get(0).getUsername());
        assertEquals(1, entries.get(0).getChange()); // was #2
        assertEquals("alice", entries.get(1).getUsername());
        assertEquals(-1, entries.get(1).getChange()); // was #1
        assertEquals("cara", entries.get(2).getUsername());
        assertNull(entries.get(2).getChange()); // not ranked a week ago
    }

    @Test
    void me_forSharingViewer_listsRankParticipantsAndTheLifterAhead() {
        User a = user(1, "alice", true);
        User k = user(2, "kavin", true);
        givenSharers(
                List.of(a, k),
                List.of(
                        lift(a, TODAY.minusDays(3), "Bench Press", "245", 5),
                        lift(k, TODAY.minusDays(1), "Bench Press", "225", 5),
                        lift(k, TODAY.minusDays(1), "Squats", "275", 5)));

        LeaderboardDTO.Me me = leaderboardService.getLeaderboard("month", "kavin", TODAY).getMe();

        assertTrue(me.isSharing());
        assertEquals(2, me.getStandings().size());
        LeaderboardDTO.Standing bench =
                me.getStandings().stream()
                        .filter(s -> s.getExerciseName().equals("Bench Press"))
                        .findFirst()
                        .orElseThrow();
        assertEquals(2, bench.getRank());
        assertEquals(2, bench.getParticipantCount());
        assertEquals(0, new BigDecimal("225").compareTo(bench.getBestWeight()));
        assertEquals("alice", bench.getAhead().getUsername());
        assertEquals(TODAY.minusDays(1), bench.getAchievedDate());
        LeaderboardDTO.Standing squats =
                me.getStandings().stream()
                        .filter(s -> s.getExerciseName().equals("Squats"))
                        .findFirst()
                        .orElseThrow();
        assertEquals(1, squats.getRank());
        assertNull(squats.getAhead());
    }

    @Test
    void me_forViewerNotSharing_saysSoWithNoStandings() {
        User a = user(1, "alice", true);
        givenSharers(List.of(a), List.of(lift(a, TODAY, "Bench Press", "200", 5)));

        LeaderboardDTO.Me me = leaderboardService.getLeaderboard("month", "kavin", TODAY).getMe();

        assertFalse(me.isSharing());
        assertTrue(me.getStandings().isEmpty());
    }

    @Test
    void mostActive_ranksBySessionsThisPeriod() {
        User a = user(1, "alice", true);
        User b = user(2, "bob", true);
        givenSharers(
                List.of(a, b),
                List.of(
                        lift(a, TODAY.minusDays(1), "Bench Press", "100", 5),
                        lift(b, TODAY.minusDays(1), "Bench Press", "100", 5),
                        lift(b, TODAY.minusDays(2), "Squats", "100", 5),
                        lift(a, LocalDate.of(2026, 9, 1), "Squats", "100", 5),
                        lift(a, LocalDate.of(2026, 9, 2), "Squats", "100", 5)));

        List<LeaderboardDTO.ActiveUser> active =
                leaderboardService.getLeaderboard("month", null, TODAY).getMostActive();

        assertEquals("bob", active.get(0).getUsername());
        assertEquals(2, active.get(0).getSessionCount());
        assertEquals("alice", active.get(1).getUsername());
        assertEquals(1, active.get(1).getSessionCount());
    }

    @Test
    void prCount_countsNewBestWeightsSetThisPeriod() {
        User a = user(1, "alice", true);
        givenSharers(
                List.of(a),
                List.of(
                        lift(
                                a,
                                LocalDate.of(2026, 9, 5),
                                "Bench Press",
                                "200",
                                5), // first set: no PR
                        lift(
                                a,
                                LocalDate.of(2026, 9, 12),
                                "Bench Press",
                                "205",
                                5), // PR, last month
                        lift(a, LocalDate.of(2026, 10, 2), "Bench Press", "210", 5), // PR
                        lift(a, LocalDate.of(2026, 10, 9), "Bench Press", "210", 6), // same weight
                        lift(a, LocalDate.of(2026, 10, 20), "Bench Press", "215", 3))); // PR

        assertEquals(2, leaderboardService.getLeaderboard("month", null, TODAY).getPrCount());
        assertEquals(3, leaderboardService.getLeaderboard("all", null, TODAY).getPrCount());
    }

    @Test
    void cardioSets_areLeftOffTheBoards() {
        User a = user(1, "alice", true);
        ExerciseSet run = lift(a, TODAY, "Running", "0", 1);
        run.setDistanceMiles(new BigDecimal("3.1"));
        run.setDurationSeconds(1500);
        givenSharers(List.of(a), List.of(run, lift(a, TODAY, "Bench Press", "135", 5)));

        LeaderboardDTO dto = leaderboardService.getLeaderboard("month", null, TODAY);

        assertEquals(
                List.of("Bench Press"),
                dto.getExercises().stream()
                        .map(LeaderboardDTO.ExerciseLeaderboard::getExerciseName)
                        .toList());
    }

    @Test
    void activity_coversTheLastThirtyDaysEndingToday() {
        User a = user(1, "alice", true);
        givenSharers(
                List.of(a), List.of(lift(a, LocalDate.of(2026, 10, 1), "Bench Press", "135", 5)));

        List<LeaderboardDTO.ActivityPoint> activity =
                leaderboardService.getLeaderboard("month", null, TODAY).getActivity();

        assertEquals(30, activity.size());
        assertEquals(TODAY, activity.get(29).getDate());
        assertEquals(TODAY.minusDays(29), activity.get(0).getDate());
    }
}
