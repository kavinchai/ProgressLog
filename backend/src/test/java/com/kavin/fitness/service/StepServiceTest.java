package com.kavin.fitness.service;

import com.kavin.fitness.dto.StepLogRequest;
import com.kavin.fitness.model.StepLog;
import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.StepLogRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StepServiceTest {

    @Mock StepLogRepository stepLogRepository;
    @InjectMocks StepService stepService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setUsername("testuser");
        ReflectionTestUtils.setField(user, "id", 1L);
    }

    // ── getStepLogs ─────────────────────────────────────────────────────────

    @Test
    void getStepLogs_returnsAllLogsForUser() {
        StepLog log1 = stepLog(1L, LocalDate.of(2026, 4, 1), 8000);
        StepLog log2 = stepLog(2L, LocalDate.of(2026, 4, 2), 12000);
        when(stepLogRepository.findByUserIdOrderByLogDateAsc(1L)).thenReturn(List.of(log1, log2));

        List<StepLog> result = stepService.getStepLogs(1L);

        assertEquals(2, result.size());
        assertEquals(8000, result.get(0).getSteps());
        assertEquals(12000, result.get(1).getSteps());
    }

    @Test
    void getStepLogs_returnsEmptyListWhenNoLogs() {
        when(stepLogRepository.findByUserIdOrderByLogDateAsc(1L)).thenReturn(List.of());

        assertTrue(stepService.getStepLogs(1L).isEmpty());
    }

    // ── save (upsert) ───────────────────────────────────────────────────────

    @Test
    void save_createsNewStepLog() {
        StepLogRequest request = new StepLogRequest();
        request.setLogDate(LocalDate.of(2026, 4, 10));
        request.setSteps(10000);

        when(stepLogRepository.findByUserIdAndLogDate(1L, LocalDate.of(2026, 4, 10)))
                .thenReturn(Optional.empty());
        when(stepLogRepository.save(any())).thenAnswer(inv -> {
            StepLog log = inv.getArgument(0);
            ReflectionTestUtils.setField(log, "id", 5L);
            return log;
        });

        StepLog result = stepService.save(user, request);

        assertEquals(5L, result.getId());
        assertEquals(LocalDate.of(2026, 4, 10), result.getLogDate());
        assertEquals(10000, result.getSteps());
        assertEquals(user, result.getUser());
    }

    @Test
    void save_updatesExistingStepLog() {
        StepLog existing = stepLog(3L, LocalDate.of(2026, 4, 10), 5000);
        when(stepLogRepository.findByUserIdAndLogDate(1L, LocalDate.of(2026, 4, 10)))
                .thenReturn(Optional.of(existing));
        when(stepLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        StepLogRequest request = new StepLogRequest();
        request.setLogDate(LocalDate.of(2026, 4, 10));
        request.setSteps(12000);

        StepLog result = stepService.save(user, request);

        assertEquals(3L, result.getId());
        assertEquals(12000, result.getSteps());
    }

    // ── delete ───────────────────────────────────────────────────────────────

    @Test
    void delete_removesLogOwnedByUser() {
        StepLog log = stepLog(3L, LocalDate.of(2026, 4, 5), 9000);
        when(stepLogRepository.findById(3L)).thenReturn(Optional.of(log));

        stepService.delete(3L, 1L);

        verify(stepLogRepository).delete(log);
    }

    @Test
    void delete_throwsWhenLogNotFound() {
        when(stepLogRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> stepService.delete(99L, 1L));
    }

    @Test
    void delete_throwsWhenLogBelongsToAnotherUser() {
        StepLog log = stepLog(3L, LocalDate.of(2026, 4, 5), 9000);
        when(stepLogRepository.findById(3L)).thenReturn(Optional.of(log));

        assertThrows(EntityNotFoundException.class, () -> stepService.delete(3L, 999L));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private StepLog stepLog(Long id, LocalDate date, int steps) {
        StepLog log = new StepLog();
        ReflectionTestUtils.setField(log, "id", id);
        log.setUser(user);
        log.setLogDate(date);
        log.setSteps(steps);
        return log;
    }
}
