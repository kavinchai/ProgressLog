package com.kavin.fitness.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class WorkoutTemplateDTO {

    private Long id;
    private String name;
    private List<ExerciseDTO> exercises;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class ExerciseDTO {
        private String exerciseName;
        private List<SetDTO> sets;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class SetDTO {
        private Integer setNumber;
        private Integer reps;
        private BigDecimal weightLbs;
    }
}
