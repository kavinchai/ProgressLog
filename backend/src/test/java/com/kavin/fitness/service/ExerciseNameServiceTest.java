package com.kavin.fitness.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.kavin.fitness.dto.ExerciseMatchesDTO;
import com.kavin.fitness.repository.ExerciseSetRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ExerciseNameServiceTest {

    @Mock ExerciseSetRepository exerciseSetRepository;
    @InjectMocks ExerciseNameService exerciseNameService;

    @BeforeEach
    void setUp() {
        // The viewer's own lifts: name, sessions
        when(exerciseSetRepository.countSessionsPerLiftName(1L))
                .thenReturn(
                        List.<Object[]>of(
                                new Object[] {"Lat Pulldowns", 31L},
                                new Object[] {"Incline Bench Press", 11L},
                                new Object[] {"Incline Dumbbell Press", 13L},
                                new Object[] {"Single Arm Cable Pulldown", 3L}));
        // Names used by people who share on the leaderboard: name, lifters
        when(exerciseSetRepository.countSharersPerLiftName())
                .thenReturn(
                        List.<Object[]>of(
                                new Object[] {"Lat Pulldowns", 1L},
                                new Object[] {"Lat Pulldown", 1L},
                                new Object[] {"Leg Extensions", 2L}));
    }

    private static List<String> names(List<ExerciseMatchesDTO.Match> matches) {
        return matches.stream().map(ExerciseMatchesDTO.Match::getName).toList();
    }

    @Test
    void spellingVariant_listsTheSameLift_mostUsedByYouFirst() {
        ExerciseMatchesDTO dto = exerciseNameService.findMatches(1L, "lat pull down");

        assertNull(dto.getExact());
        assertEquals(List.of("Lat Pulldowns", "Lat Pulldown"), names(dto.getSame()));
        assertEquals(31, dto.getSame().get(0).getYourSessions());
        assertEquals(1, dto.getSame().get(0).getLifters());
        assertEquals(0, dto.getSame().get(1).getYourSessions());
    }

    @Test
    void exactName_isReportedAsExact_notAsADifferentLift() {
        ExerciseMatchesDTO dto = exerciseNameService.findMatches(1L, "Lat Pulldowns");

        assertEquals("Lat Pulldowns", dto.getExact().getName());
        assertEquals(31, dto.getExact().getYourSessions());
        assertEquals(List.of("Lat Pulldown"), names(dto.getSame()));
    }

    @Test
    void sharedOnlyName_canBeSuggested() {
        ExerciseMatchesDTO dto = exerciseNameService.findMatches(1L, "leg extension");

        assertEquals(List.of("Leg Extensions"), names(dto.getSame()));
        assertEquals(2, dto.getSame().get(0).getLifters());
    }

    @Test
    void looseWords_areListedAsPossible() {
        ExerciseMatchesDTO dto = exerciseNameService.findMatches(1L, "incline press");

        assertTrue(dto.getSame().isEmpty());
        assertEquals(
                List.of("Incline Dumbbell Press", "Incline Bench Press"), names(dto.getPossible()));
    }

    @Test
    void newLift_hasNoMatches() {
        ExerciseMatchesDTO dto = exerciseNameService.findMatches(1L, "Hip Thrust");

        assertNull(dto.getExact());
        assertTrue(dto.getSame().isEmpty());
        assertTrue(dto.getPossible().isEmpty());
    }

    @Test
    void blankName_hasNoMatches() {
        ExerciseMatchesDTO dto = exerciseNameService.findMatches(1L, "  ");

        assertTrue(dto.getSame().isEmpty());
        verifyNoInteractions(exerciseSetRepository);
    }
}
