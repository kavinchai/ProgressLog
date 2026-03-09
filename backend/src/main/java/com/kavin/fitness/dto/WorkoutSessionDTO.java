package com.kavin.fitness.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class WorkoutSessionDTO {

    private Long         id;
    private LocalDate    sessionDate;
    private List<SetDTO> exerciseSets;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class SetDTO {
        private Long       id;
        private String     exerciseName;
        private Integer    setNumber;
        private Integer    reps;
        private BigDecimal weightLbs;
        private Boolean    completed;
    }
}
