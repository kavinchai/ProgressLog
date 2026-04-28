package com.kavin.fitness.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class CardioProgressDTO {

    private String exerciseName;
    private List<CardioSessionData> data;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class CardioSessionData {
        private LocalDate  sessionDate;
        private BigDecimal totalDistanceMiles;
        private int        totalDurationSeconds;
    }
}
