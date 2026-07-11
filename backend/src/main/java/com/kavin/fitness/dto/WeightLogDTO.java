package com.kavin.fitness.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class WeightLogDTO {
    private Long id;
    private LocalDate logDate;
    private BigDecimal weightLbs;
}
