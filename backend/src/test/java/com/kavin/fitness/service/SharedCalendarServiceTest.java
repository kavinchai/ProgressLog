package com.kavin.fitness.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

import com.kavin.fitness.dto.SharedCalendarDTO;
import com.kavin.fitness.model.ExerciseSet;
import com.kavin.fitness.model.User;
import com.kavin.fitness.model.WorkoutSession;
import com.kavin.fitness.repository.UserRepository;
import com.kavin.fitness.repository.WorkoutSessionRepository;
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
class SharedCalendarServiceTest {

    @Mock UserRepository userRepository;
    @Mock WorkoutSessionRepository workoutSessionRepository;
    @InjectMocks SharedCalendarService sharedCalendarService;

    private final User alice = user();

    private static User user() {
        User u = new User();
        u.setUsername("alice");
        u.setShareCalendar(true);
        ReflectionTestUtils.setField(u, "id", 1L);
        return u;
    }

    private WorkoutSession session(long id, LocalDate date) {
        WorkoutSession s = new WorkoutSession();
        s.setUser(alice);
        s.setSessionDate(date);
        s.setExerciseSets(new ArrayList<>());
        ReflectionTestUtils.setField(s, "id", id);
        return s;
    }

    private static void addSet(
            WorkoutSession s, String name, String weight, String miles, Integer seconds) {
        ExerciseSet e = new ExerciseSet();
        e.setSession(s);
        e.setExerciseName(name);
        e.setSetNumber(1);
        e.setReps(5);
        e.setWeightLbs(new BigDecimal(weight));
        e.setDistanceMiles(miles == null ? null : new BigDecimal(miles));
        e.setDurationSeconds(seconds);
        s.getExerciseSets().add(e);
    }

    @Test
    void getCalendar_showsOnlyLifts_andDropsCardioOnlySessions() {
        WorkoutSession mixed = session(1, LocalDate.of(2026, 10, 1));
        addSet(mixed, "Squats", "225", null, null);
        addSet(mixed, "Run", "0", "3.10", 1600);
        WorkoutSession runOnly = session(2, LocalDate.of(2026, 10, 2));
        addSet(runOnly, "Run", "0", "2.00", 1000);
        WorkoutSession liftsOnly = session(3, LocalDate.of(2026, 10, 3));
        addSet(liftsOnly, "Bench Press", "185", null, null);
        when(userRepository.findByShareCalendarTrue()).thenReturn(List.of(alice));
        when(workoutSessionRepository.findByUserIdInWithSetsOrderByDateDesc(anyList()))
                .thenReturn(List.of(mixed, runOnly, liftsOnly));

        SharedCalendarDTO dto = sharedCalendarService.getCalendar();

        assertEquals(
                List.of(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 3)),
                dto.getEntries().stream().map(SharedCalendarDTO.Entry::getSessionDate).toList());
        assertEquals(
                List.of("Squats"),
                dto.getEntries().get(0).getSets().stream()
                        .map(SharedCalendarDTO.Set::getExerciseName)
                        .toList());
        assertEquals(1, dto.getEntries().get(1).getSets().size());
    }
}
