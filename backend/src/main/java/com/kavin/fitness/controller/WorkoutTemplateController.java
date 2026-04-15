package com.kavin.fitness.controller;

import com.kavin.fitness.dto.WorkoutTemplateDTO;
import com.kavin.fitness.dto.WorkoutTemplateRequest;


import com.kavin.fitness.service.WorkoutTemplateService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/templates")
public class WorkoutTemplateController {

    @Autowired private WorkoutTemplateService templateService;
    @Autowired private UserResolver userResolver;

    @GetMapping
    public ResponseEntity<List<WorkoutTemplateDTO>> getTemplates(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(templateService.getTemplates(userResolver.resolve(principal).getId()));
    }

    @PostMapping
    public ResponseEntity<WorkoutTemplateDTO> createTemplate(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody WorkoutTemplateRequest request) {
        WorkoutTemplateDTO created = templateService.create(userResolver.resolve(principal), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{templateId}")
    public ResponseEntity<WorkoutTemplateDTO> updateTemplate(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long templateId,
            @Valid @RequestBody WorkoutTemplateRequest request) {
        WorkoutTemplateDTO updated = templateService.update(
                templateId, userResolver.resolve(principal).getId(), request);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/import")
    public ResponseEntity<List<WorkoutTemplateDTO>> importTemplates(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody List<WorkoutTemplateRequest> requests) {
        List<WorkoutTemplateDTO> imported = templateService.importAll(userResolver.resolve(principal), requests);
        return ResponseEntity.status(HttpStatus.CREATED).body(imported);
    }

    @DeleteMapping("/{templateId}")
    public ResponseEntity<Void> deleteTemplate(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long templateId) {
        templateService.delete(templateId, userResolver.resolve(principal).getId());
        return ResponseEntity.noContent().build();
    }

}
