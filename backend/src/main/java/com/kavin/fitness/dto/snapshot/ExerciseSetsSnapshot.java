package com.kavin.fitness.dto.snapshot;

import com.kavin.fitness.dto.ExerciseRequest;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/** Snapshot for "delete all sets of one exercise within a session". */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ExerciseSetsSnapshot {
    private Long sessionId;
    private String exerciseName;
    private List<ExerciseRequest.SetRequest> sets;
}
