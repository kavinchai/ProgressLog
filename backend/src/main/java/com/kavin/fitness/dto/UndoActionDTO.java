package com.kavin.fitness.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Surfaced by GET /api/undo/recent and POST /api/undo so callers
 * (web UI, MCP) can describe what was undone or is undoable.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class UndoActionDTO {
    private Long id;
    private String entityType;
    private String summary;
    private Instant createdAt;
}
