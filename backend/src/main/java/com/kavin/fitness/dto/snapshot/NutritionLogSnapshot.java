package com.kavin.fitness.dto.snapshot;

import com.kavin.fitness.dto.MealRequest;
import java.time.LocalDate;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Snapshot for "delete an entire nutrition day log (and its meals)". */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NutritionLogSnapshot {
    private LocalDate logDate;
    private String dayType;
    private List<MealRequest> meals;
}
