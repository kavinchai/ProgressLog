package com.kavin.fitness.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class WeightLogRequest {

    @NotNull private LocalDate logDate;

    @NotNull
    @DecimalMin("0.0")
    private BigDecimal weightLbs;
}
