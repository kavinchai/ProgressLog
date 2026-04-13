package com.kavin.fitness.controller;

import com.kavin.fitness.dto.ImportRequest;
import com.kavin.fitness.dto.ImportResultDTO;
import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.UserRepository;
import com.kavin.fitness.service.ImportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/import")
public class ImportController {

    @Autowired private ImportService importService;
    @Autowired private UserRepository userRepository;

    @PostMapping
    public ResponseEntity<ImportResultDTO> importData(
            @AuthenticationPrincipal UserDetails principal,
            @RequestBody ImportRequest request) {
        ImportResultDTO result = importService.importData(resolveUser(principal), request);
        return ResponseEntity.ok(result);
    }

    private User resolveUser(UserDetails principal) {
        return userRepository.findByUsername(principal.getUsername())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
    }
}
