package com.kavin.fitness.controller;

import com.kavin.fitness.dto.UndoActionDTO;
import com.kavin.fitness.service.UndoService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/undo")
@RequiredArgsConstructor
public class UndoController {

    private final UndoService undoService;
    private final UserResolver userResolver;

    /** Replay the most recent un-restored entry in this user's deletion journal. */
    @PostMapping
    public ResponseEntity<UndoActionDTO> undoLast(@AuthenticationPrincipal UserDetails principal) {
        log.info("POST undo user={}", principal.getUsername());
        UndoActionDTO restored = undoService.undoLast(userResolver.resolve(principal));
        return ResponseEntity.ok(restored);
    }

    /** List the most recent un-restored deletions so callers can preview what's undoable. */
    @GetMapping("/recent")
    public ResponseEntity<List<UndoActionDTO>> recent(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(
                undoService.getRecentActions(userResolver.resolve(principal).getId()));
    }
}
