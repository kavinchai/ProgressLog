package com.kavin.fitness.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class StepLogRequest {

    @NotNull private LocalDate logDate;

    @NotNull
    @Min(0)
    private Integer steps;
}
