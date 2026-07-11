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
public class PREntryDTO {
    private String exerciseName;
    private BigDecimal maxWeightLbs;
    private int setCount;
    private int maxRepsInSet;
    private LocalDate achievedDate;
}
