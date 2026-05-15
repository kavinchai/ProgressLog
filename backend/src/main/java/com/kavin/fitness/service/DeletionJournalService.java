package com.kavin.fitness.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kavin.fitness.dto.UndoActionDTO;
import com.kavin.fitness.model.DeletionJournalEntry;
import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.DeletionJournalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Records destructive operations to the deletion journal so they can
 * later be replayed by {@link UndoService}. Each delete service hits
 * this with a JSON snapshot of what's about to be removed.
 */
@Service
public class DeletionJournalService {

    public static final String TYPE_WORKOUT_SESSION = "workout_session";
    public static final String TYPE_EXERCISE_SET   = "exercise_set";
    public static final String TYPE_NUTRITION_LOG  = "nutrition_log";
    public static final String TYPE_MEAL           = "meal";
    public static final String TYPE_STEP_LOG       = "step_log";
    public static final String TYPE_WEIGHT_LOG     = "weight_log";

    @Autowired private DeletionJournalRepository repository;
    @Autowired private ObjectMapper objectMapper;

    @Transactional
    public DeletionJournalEntry record(User user, String entityType, String summary, Object snapshotPojo) {
        String json;
        try {
            json = objectMapper.writeValueAsString(snapshotPojo);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(
                    "Failed to serialize " + entityType + " snapshot for undo journal", e);
        }
        DeletionJournalEntry entry = new DeletionJournalEntry();
        entry.setUser(user);
        entry.setEntityType(entityType);
        entry.setSummary(summary);
        entry.setSnapshot(json);
        return repository.save(entry);
    }

    @Transactional(readOnly = true)
    public List<UndoActionDTO> getRecent(Long userId) {
        return repository.findTop20ByUserIdAndRestoredAtIsNullOrderByCreatedAtDesc(userId)
                .stream()
                .map(entry -> new UndoActionDTO(
                        entry.getId(),
                        entry.getEntityType(),
                        entry.getSummary(),
                        entry.getCreatedAt()))
                .collect(Collectors.toList());
    }
}
