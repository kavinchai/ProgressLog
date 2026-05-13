package com.kavin.fitness.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class LeaderboardDTO {

    private int totalUsers;
    private int totalSessions;
    private int totalSets;
    private List<ExerciseLeaderboard> exercises;
    private List<TopUser> topLifters;
    private List<ActivityPoint> activity;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class ExerciseLeaderboard {
        private String exerciseName;
        private String type;            // "strength" | "cardio"
        private int    totalSets;
        private int    participantCount;
        private List<Entry> entries;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class Entry {
        private int        rank;
        private String     username;
        private BigDecimal score;       // strength: best weight × reps; cardio: total distance (mi)
        private BigDecimal bestWeight;  // nullable for cardio
        private Integer    bestReps;    // nullable for cardio
        private BigDecimal totalDistance; // nullable for strength
        private Integer    totalDurationSeconds; // nullable for strength
        private LocalDate  achievedDate;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class TopUser {
        private int        rank;
        private String     username;
        private int        sessionCount;
        private int        totalSets;
        private BigDecimal totalVolumeLbs;  // sum of (weight × reps) across strength sets
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class ActivityPoint {
        private LocalDate date;
        private int       sessionCount;
        private int       setCount;
    }
}
