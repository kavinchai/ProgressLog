package com.kavin.fitness.dto.snapshot;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Snapshot for "delete a single meal from a day log". */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class MealSnapshot {
    private Long logId;
    private String mealName;
    private Integer calories;
    private Integer proteinGrams;
}
