package com.kavin.fitness.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor
public class WorkoutSessionRequest {

    @NotNull
    private LocalDate sessionDate;

    @Valid
    private List<ExerciseRequest> exercises;
}
