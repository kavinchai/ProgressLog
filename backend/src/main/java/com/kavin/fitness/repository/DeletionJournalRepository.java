package com.kavin.fitness.repository;

import com.kavin.fitness.model.DeletionJournalEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeletionJournalRepository extends JpaRepository<DeletionJournalEntry, Long> {

    /** Most recent un-restored entry for a user. */
    Optional<DeletionJournalEntry> findFirstByUserIdAndRestoredAtIsNullOrderByCreatedAtDesc(Long userId);

    /** Most recent N un-restored entries for a user (for showing what's undoable). */
    List<DeletionJournalEntry> findTop20ByUserIdAndRestoredAtIsNullOrderByCreatedAtDesc(Long userId);

    /** Hard-delete journal entries older than the cutoff. Returns the number deleted. */
    @Modifying
    @Query("DELETE FROM DeletionJournalEntry j WHERE j.createdAt < :cutoff")
    int deleteByCreatedAtBefore(@Param("cutoff") Instant cutoff);
}
