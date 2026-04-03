package com.kavin.fitness.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class PREntryDTO {
    private String     exerciseName;
    private BigDecimal maxWeightLbs;
    private LocalDate  achievedDate;
}
