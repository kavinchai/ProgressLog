package com.kavin.fitness.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "deletion_journal")
@Getter @Setter @NoArgsConstructor
public class DeletionJournalEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** One of: workout_session, exercise_set, nutrition_log, meal, step_log, weight_log. */
    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType;

    /** Human-readable description shown in undo prompts. */
    @Column(nullable = false, length = 255)
    private String summary;

    /** JSON snapshot of the deleted data; deserialized at restore time. */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String snapshot;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "restored_at")
    private Instant restoredAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
