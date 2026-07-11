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
public class SharedCalendarDTO {
    private int totalUsers;
    private List<Entry> entries;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Entry {
        private String username;
        private LocalDate sessionDate;
        private String sessionName;
        private List<Set> sets;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Set {
        private String exerciseName;
        private Integer setNumber;
        private Integer reps;
        private BigDecimal weightLbs;
        private BigDecimal distanceMiles;
        private Integer durationSeconds;
    }
}
