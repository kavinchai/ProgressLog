package com.kavin.fitness.service;

import com.kavin.fitness.dto.MilestoneDTO;
import com.kavin.fitness.dto.PREntryDTO;
import com.kavin.fitness.dto.StrengthProgressDTO;
import com.kavin.fitness.model.ExerciseSet;
import com.kavin.fitness.model.WorkoutSession;
import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.ExerciseSetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProgressServiceTest {

    @Mock ExerciseSetRepository exerciseSetRepository;
    @InjectMocks ProgressService progressService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setUsername("testuser");
        ReflectionTestUtils.setField(user, "id", 1L);
    }

    // ── getStrengthProgress ──────────────────────────────────────────────────

    @Test
    void getStrengthProgress_returnsEmptyWhenNoExercises() {
        when(exerciseSetRepository.findDistinctExerciseNamesByUserId(1L)).thenReturn(List.of());

        List<StrengthProgressDTO> result = progressService.getStrengthProgress(1L);

        assertTrue(result.isEmpty());
    }

    @Test
    void getStrengthProgress_groupsByExerciseAndDate() {
        WorkoutSession session = session(LocalDate.of(2026, 3, 1));
        ExerciseSet set1 = exerciseSet(session, "Bench Press", 1, 6, "135");
        ExerciseSet set2 = exerciseSet(session, "Bench Press", 2, 6, "135");

        when(exerciseSetRepository.findDistinctExerciseNamesByUserId(1L))
                .thenReturn(List.of("Bench Press"));
        when(exerciseSetRepository.findByUserIdAndExerciseNameOrderByDate(1L, "Bench Press"))
                .thenReturn(List.of(set1, set2));

        List<StrengthProgressDTO> result = progressService.getStrengthProgress(1L);

        assertEquals(1, result.size());
        assertEquals("Bench Press", result.get(0).getExerciseName());
        assertEquals(1, result.get(0).getData().size());

        StrengthProgressDTO.SessionData data = result.get(0).getData().get(0);
        assertEquals(LocalDate.of(2026, 3, 1), data.getSessionDate());
        assertEquals(new BigDecimal("135"), data.getMaxWeightLbs());
        assertEquals(2, data.getSetCount());
        assertEquals("6/6", data.getRepScheme());
    }

    @Test
    void getStrengthProgress_keyLiftsAppearFirst() {
        // "Squats" is a key lift; "Curls" is not
        when(exerciseSetRepository.findDistinctExerciseNamesByUserId(1L))
                .thenReturn(List.of("Curls", "Squats"));

        WorkoutSession session = session(LocalDate.of(2026, 3, 1));

        when(exerciseSetRepository.findByUserIdAndExerciseNameOrderByDate(1L, "Squats"))
                .thenReturn(List.of(exerciseSet(session, "Squats", 1, 5, "225")));
        when(exerciseSetRepository.findByUserIdAndExerciseNameOrderByDate(1L, "Curls"))
                .thenReturn(List.of(exerciseSet(session, "Curls", 1, 12, "30")));

        // Key lifts with no data are skipped, so mock the rest as empty
        when(exerciseSetRepository.findByUserIdAndExerciseNameOrderByDate(eq(1L), argThat(
                name -> !name.equals("Squats") && !name.equals("Curls"))))
                .thenReturn(List.of());

        List<StrengthProgressDTO> result = progressService.getStrengthProgress(1L);

        assertEquals(2, result.size());
        assertEquals("Squats", result.get(0).getExerciseName());
        assertEquals("Curls", result.get(1).getExerciseName());
    }

    @Test
    void getStrengthProgress_separatesSessionsByWeight() {
        WorkoutSession session = session(LocalDate.of(2026, 3, 1));
        ExerciseSet light = exerciseSet(session, "Bench Press", 1, 10, "95");
        ExerciseSet heavy = exerciseSet(session, "Bench Press", 2, 5, "135");

        when(exerciseSetRepository.findDistinctExerciseNamesByUserId(1L))
                .thenReturn(List.of("Bench Press"));
        when(exerciseSetRepository.findByUserIdAndExerciseNameOrderByDate(1L, "Bench Press"))
                .thenReturn(List.of(light, heavy));

        List<StrengthProgressDTO> result = progressService.getStrengthProgress(1L);

        // Two entries for the same date — one per weight, heavier first
        assertEquals(2, result.get(0).getData().size());
        assertEquals(new BigDecimal("135"), result.get(0).getData().get(0).getMaxWeightLbs());
        assertEquals(new BigDecimal("95"), result.get(0).getData().get(1).getMaxWeightLbs());
    }

    // ── getPRs ───────────────────────────────────────────────────────────────

    @Test
    void getPRs_returnsEmptyWhenNoExercises() {
        when(exerciseSetRepository.findMaxWeightPerExercise(1L)).thenReturn(List.of());

        assertTrue(progressService.getPRs(1L).isEmpty());
    }

    @Test
    void getPRs_returnsSortedByExerciseName() {
        Object[] row1 = new Object[]{"Squat", new BigDecimal("225")};
        Object[] row2 = new Object[]{"Bench Press", new BigDecimal("135")};

        when(exerciseSetRepository.findMaxWeightPerExercise(1L)).thenReturn(List.of(row1, row2));
        when(exerciseSetRepository.findFirstDateForMaxWeight(1L, "Squat", new BigDecimal("225")))
                .thenReturn(LocalDate.of(2026, 3, 5));
        when(exerciseSetRepository.findFirstDateForMaxWeight(1L, "Bench Press", new BigDecimal("135")))
                .thenReturn(LocalDate.of(2026, 3, 1));

        List<PREntryDTO> result = progressService.getPRs(1L);

        assertEquals(2, result.size());
        assertEquals("Bench Press", result.get(0).getExerciseName());
        assertEquals("Squat", result.get(1).getExerciseName());
        assertEquals(new BigDecimal("225"), result.get(1).getMaxWeightLbs());
        assertEquals(LocalDate.of(2026, 3, 5), result.get(1).getAchievedDate());
    }

    // ── getMilestones ────────────────────────────────────────────────────────

    @Test
    void getMilestones_returnsHardcodedList() {
        List<MilestoneDTO> milestones = progressService.getMilestones(1L);

        assertFalse(milestones.isEmpty());
        assertEquals("Transformation Begins", milestones.get(0).getTitle());
    }

    @Test
    void getMilestones_containsMilestoneAndAchievementAndSetbackTypes() {
        List<MilestoneDTO> milestones = progressService.getMilestones(1L);

        assertTrue(milestones.stream().anyMatch(m -> "milestone".equals(m.getType())));
        assertTrue(milestones.stream().anyMatch(m -> "achievement".equals(m.getType())));
        assertTrue(milestones.stream().anyMatch(m -> "setback".equals(m.getType())));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private WorkoutSession session(LocalDate date) {
        WorkoutSession s = new WorkoutSession();
        s.setUser(user);
        s.setSessionDate(date);
        ReflectionTestUtils.setField(s, "id", 1L);
        return s;
    }

    private ExerciseSet exerciseSet(WorkoutSession session, String name, int setNum, int reps, String weight) {
        ExerciseSet es = new ExerciseSet();
        es.setSession(session);
        es.setExerciseName(name);
        es.setSetNumber(setNum);
        es.setReps(reps);
        es.setWeightLbs(new BigDecimal(weight));
        es.setCompleted(true);
        return es;
    }
}
