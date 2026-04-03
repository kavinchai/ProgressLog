package com.kavin.fitness.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter @Setter @NoArgsConstructor
public class WorkoutTemplateRequest {

    @NotBlank
    private String name;

    @Valid
    private List<ExerciseRequest> exercises;
}
