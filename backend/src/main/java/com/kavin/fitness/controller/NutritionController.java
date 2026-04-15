package com.kavin.fitness.controller;

import com.kavin.fitness.dto.MealRequest;
import com.kavin.fitness.dto.NutritionLogDTO;
import com.kavin.fitness.dto.NutritionLogRequest;
import com.kavin.fitness.service.NutritionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/nutrition")
public class NutritionController {

    @Autowired private NutritionService nutritionService;
    @Autowired private UserResolver     userResolver;

    @GetMapping
    public ResponseEntity<List<NutritionLogDTO>> getNutritionLog(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(nutritionService.getNutritionLog(userResolver.resolve(principal).getId()));
    }

    /** Create or update the day log (dayType + steps). */
    @PostMapping
    public ResponseEntity<NutritionLogDTO> upsertLog(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody NutritionLogRequest request) {
        NutritionLogDTO dto = nutritionService.upsertLog(userResolver.resolve(principal), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    /** Delete an entire day log. */
    @DeleteMapping("/{logId}")
    public ResponseEntity<Void> deleteLog(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long logId) {
        nutritionService.deleteLog(logId, userResolver.resolve(principal).getId());
        return ResponseEntity.noContent().build();
    }

    /** Add a meal to an existing day log. */
    @PostMapping("/{logId}/meals")
    public ResponseEntity<NutritionLogDTO> addMeal(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long logId,
            @Valid @RequestBody MealRequest request) {
        NutritionLogDTO dto = nutritionService.addMeal(
                logId, userResolver.resolve(principal).getId(), request);
        return ResponseEntity.ok(dto);
    }

    /** Update an existing meal. */
    @PutMapping("/{logId}/meals/{mealId}")
    public ResponseEntity<NutritionLogDTO> updateMeal(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long logId,
            @PathVariable Long mealId,
            @Valid @RequestBody MealRequest request) {
        NutritionLogDTO dto = nutritionService.updateMeal(
                logId, mealId, userResolver.resolve(principal).getId(), request);
        return ResponseEntity.ok(dto);
    }

    /** Delete a meal. */
    @DeleteMapping("/{logId}/meals/{mealId}")
    public ResponseEntity<Void> deleteMeal(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long logId,
            @PathVariable Long mealId) {
        nutritionService.deleteMeal(logId, mealId, userResolver.resolve(principal).getId());
        return ResponseEntity.noContent().build();
    }

}
