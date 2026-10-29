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
public class LeaderboardDTO {

    private int totalUsers;
    private int totalSessions; // within the period
    private int totalSets; // within the period
    private int prCount; // new best weights set within the period
    private List<ExerciseLeaderboard> exercises;
    private List<ActiveUser> mostActive;
    private List<ActivityPoint> activity; // last 30 days, ending today
    private Me me; // null for anonymous viewers

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExerciseLeaderboard {
        private String exerciseName;
        private int totalSets;
        private int participantCount;
        private List<Entry> entries; // top 10
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Entry {
        private int rank;
        private String username;
        private BigDecimal bestWeight;
        private Integer bestReps;
        private LocalDate achievedDate;
        private Integer change; // places gained (+) or lost (-) since a week ago; null if new
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActiveUser {
        private int rank;
        private String username;
        private int sessionCount;
        private int totalSets;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActivityPoint {
        private LocalDate date;
        private int sessionCount;
        private int setCount;
    }

    /** The signed-in viewer's own standing. */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Me {
        private boolean sharing;
        private List<Standing> standings;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Standing {
        private String exerciseName;
        private int rank;
        private int participantCount;
        private BigDecimal bestWeight;
        private Integer bestReps;
        private LocalDate achievedDate;
        private Integer change;
        private Entry ahead; // the lifter one place above; null when first
    }
}
