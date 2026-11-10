package com.kavin.fitness.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class MealRequest {

    @Size(max = 50)
    private String mealLabel; // optional: Breakfast / Lunch / Dinner / custom

    private String mealName; // optional: what was eaten

    @Size(max = 100)
    private String restaurant; // optional: where it came from

    @NotNull
    @Min(0)
    private Integer calories;

    @NotNull
    @Min(0)
    private Integer proteinGrams;
}
