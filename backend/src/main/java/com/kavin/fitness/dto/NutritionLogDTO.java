package com.kavin.fitness.dto;

import java.time.LocalDate;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NutritionLogDTO {

    private Long id;
    private LocalDate logDate;
    private String dayType;
    private Integer totalCalories;
    private Integer totalProtein;
    private List<MealDTO> meals;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MealDTO {
        private Long id;
        private String mealName;
        private Integer calories;
        private Integer proteinGrams;
    }
}
