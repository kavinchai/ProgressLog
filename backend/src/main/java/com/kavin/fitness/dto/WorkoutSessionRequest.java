package com.kavin.fitness.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class WorkoutSessionRequest {

    @NotNull private LocalDate sessionDate;

    private String sessionName;

    @Valid private List<ExerciseRequest> exercises;
}
