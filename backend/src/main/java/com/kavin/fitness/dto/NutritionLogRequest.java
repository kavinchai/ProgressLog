package com.kavin.fitness.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class NutritionLogRequest {

    @NotNull private LocalDate logDate;

    @NotBlank private String dayType;
}
