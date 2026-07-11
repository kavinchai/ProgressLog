package com.kavin.fitness.service;

import com.kavin.fitness.repository.DeletionJournalRepository;
import java.time.Duration;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Hard-deletes deletion-journal entries older than 30 days so the undo window stays bounded. Runs
 * daily at 03:15 server time.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DeletionJournalPurgeJob {

    static final Duration RETENTION = Duration.ofDays(30);

    private final DeletionJournalRepository repository;

    @Scheduled(cron = "0 15 3 * * *")
    @Transactional
    public void purgeOldEntries() {
        Instant cutoff = Instant.now().minus(RETENTION);
        int removed = repository.deleteByCreatedAtBefore(cutoff);
        if (removed > 0) {
            log.info("Purged {} deletion-journal entries older than {}", removed, cutoff);
        }
    }
}
