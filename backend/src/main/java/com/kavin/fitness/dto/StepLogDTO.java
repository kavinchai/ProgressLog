package com.kavin.fitness.dto;

import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StepLogDTO {
    private Long id;
    private LocalDate logDate;
    private Integer steps;
}
