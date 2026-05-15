package com.kavin.fitness.dto.snapshot;

import com.kavin.fitness.dto.MealRequest;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

/** Snapshot for "delete an entire nutrition day log (and its meals)". */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class NutritionLogSnapshot {
    private LocalDate logDate;
    private String dayType;
    private List<MealRequest> meals;
}
