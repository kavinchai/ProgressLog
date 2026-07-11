package com.kavin.fitness.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StrengthProgressDTO {

    private String exerciseName;
    private List<SessionData> data;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SessionData {
        private LocalDate sessionDate;
        private BigDecimal maxWeightLbs;
        private int setCount;
        private String repScheme; // e.g. "6/6/6/5/3"
    }
}
