package com.kavin.fitness.service;

import com.kavin.fitness.repository.DeletionJournalRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeletionJournalPurgeTest {

    @Mock DeletionJournalRepository repository;
    @InjectMocks DeletionJournalPurgeJob job;

    @Test
    void purge_callsRepoWithCutoff30DaysAgo() {
        when(repository.deleteByCreatedAtBefore(any(Instant.class))).thenReturn(0);

        Instant before = Instant.now();
        job.purgeOldEntries();
        Instant after = Instant.now();

        ArgumentCaptor<Instant> captor = ArgumentCaptor.forClass(Instant.class);
        verify(repository).deleteByCreatedAtBefore(captor.capture());

        Instant cutoff = captor.getValue();
        Instant expectedMin = before.minus(Duration.ofDays(30));
        Instant expectedMax = after.minus(Duration.ofDays(30));

        // The cutoff should be ~30 days before "now"
        assertTrue(!cutoff.isBefore(expectedMin),
                "cutoff " + cutoff + " was earlier than expectedMin " + expectedMin);
        assertTrue(!cutoff.isAfter(expectedMax),
                "cutoff " + cutoff + " was later than expectedMax " + expectedMax);
    }
}
