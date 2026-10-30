package com.kavin.fitness.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Existing lift names that a typed exercise name may refer to. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ExerciseMatchesDTO {
    private Match exact; // an existing name spelled exactly as typed; null if none
    private List<Match> same; // spelling variants of the typed name — the same lift
    private List<Match> possible; // names containing every typed word — maybe the same lift

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Match {
        private String name;
        private long yourSessions; // the viewer's sessions with this lift
        private long lifters; // people sharing on the leaderboard who log it
    }
}
