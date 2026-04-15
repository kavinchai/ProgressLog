package com.kavin.fitness.controller;

import com.kavin.fitness.dto.ImportRequest;
import com.kavin.fitness.dto.ImportResultDTO;


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
    @Autowired private UserResolver userResolver;

    @PostMapping
    public ResponseEntity<ImportResultDTO> importData(
            @AuthenticationPrincipal UserDetails principal,
            @RequestBody ImportRequest request) {
        ImportResultDTO result = importService.importData(userResolver.resolve(principal), request);
        return ResponseEntity.ok(result);
    }

}
