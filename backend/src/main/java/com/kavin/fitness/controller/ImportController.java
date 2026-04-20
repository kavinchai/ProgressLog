package com.kavin.fitness.controller;

import com.kavin.fitness.dto.ImportRequest;
import com.kavin.fitness.dto.ImportResultDTO;


import com.kavin.fitness.service.ImportService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/import")
public class ImportController {

    @Autowired private ImportService importService;
    @Autowired private UserResolver userResolver;

    @PostMapping
    public ResponseEntity<ImportResultDTO> importData(
            @AuthenticationPrincipal UserDetails principal,
            @RequestBody ImportRequest request) {
        log.info("POST import user={}", principal.getUsername());
        ImportResultDTO result = importService.importData(userResolver.resolve(principal), request);
        log.info("Import complete user={} result={}", principal.getUsername(), result);
        return ResponseEntity.ok(result);
    }

}
