package com.kavin.fitness.service;

import com.kavin.fitness.dto.WeightLogRequest;
import com.kavin.fitness.model.User;
import com.kavin.fitness.model.WeightLog;
import com.kavin.fitness.repository.WeightLogRepository;
import jakarta.persistence.EntityNotFoundException;
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
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WeightServiceTest {

    @Mock WeightLogRepository weightLogRepository;
    @InjectMocks WeightService weightService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setUsername("testuser");
        ReflectionTestUtils.setField(user, "id", 1L);
    }

    // ── getWeightLog ─────────────────────────────────────────────────────────

    @Test
    void getWeightLog_returnsAllLogsForUser() {
        WeightLog log1 = weightLog(1L, LocalDate.of(2026, 3, 1), "150.0");
        WeightLog log2 = weightLog(2L, LocalDate.of(2026, 3, 2), "150.5");
        when(weightLogRepository.findByUserIdOrderByLogDateAsc(1L)).thenReturn(List.of(log1, log2));

        List<WeightLog> result = weightService.getWeightLog(1L);

        assertEquals(2, result.size());
        assertEquals(LocalDate.of(2026, 3, 1), result.get(0).getLogDate());
        assertEquals(LocalDate.of(2026, 3, 2), result.get(1).getLogDate());
    }

    @Test
    void getWeightLog_returnsEmptyListWhenNoLogs() {
        when(weightLogRepository.findByUserIdOrderByLogDateAsc(1L)).thenReturn(List.of());

        assertTrue(weightService.getWeightLog(1L).isEmpty());
    }

    // ── save ─────────────────────────────────────────────────────────────────

    @Test
    void save_createsNewWeightLog() {
        WeightLogRequest request = new WeightLogRequest();
        request.setLogDate(LocalDate.of(2026, 3, 10));
        request.setWeightLbs(new BigDecimal("151.5"));

        when(weightLogRepository.save(any())).thenAnswer(inv -> {
            WeightLog log = inv.getArgument(0);
            ReflectionTestUtils.setField(log, "id", 5L);
            return log;
        });

        WeightLog result = weightService.save(user, request);

        assertEquals(5L, result.getId());
        assertEquals(LocalDate.of(2026, 3, 10), result.getLogDate());
        assertEquals(new BigDecimal("151.5"), result.getWeightLbs());
        assertEquals(user, result.getUser());
    }

    // ── delete ───────────────────────────────────────────────────────────────

    @Test
    void delete_removesLogOwnedByUser() {
        WeightLog log = weightLog(3L, LocalDate.of(2026, 3, 5), "149.0");
        when(weightLogRepository.findById(3L)).thenReturn(Optional.of(log));

        weightService.delete(3L, 1L);

        verify(weightLogRepository).delete(log);
    }

    @Test
    void delete_throwsWhenLogNotFound() {
        when(weightLogRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> weightService.delete(99L, 1L));
    }

    @Test
    void delete_throwsWhenLogBelongsToAnotherUser() {
        WeightLog log = weightLog(3L, LocalDate.of(2026, 3, 5), "149.0");
        when(weightLogRepository.findById(3L)).thenReturn(Optional.of(log));

        assertThrows(EntityNotFoundException.class, () -> weightService.delete(3L, 999L));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private WeightLog weightLog(Long id, LocalDate date, String weight) {
        WeightLog log = new WeightLog();
        ReflectionTestUtils.setField(log, "id", id);
        log.setUser(user);
        log.setLogDate(date);
        log.setWeightLbs(new BigDecimal(weight));
        return log;
    }
}
