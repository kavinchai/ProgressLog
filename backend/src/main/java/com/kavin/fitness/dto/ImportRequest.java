package com.kavin.fitness.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter @Setter @NoArgsConstructor
public class ImportRequest {
    // Each element mirrors the exported totalStats row:
    // { "Date": "M/D/YY", "Weight": 185.5, "Calories": 2200, "Protein": 180, "Workout": "..." }
    private List<Map<String, Object>> totalStats;

    // Each element mirrors an exported workout row:
    // { "Date": "M/D/YY", "Exercise": "Bench Press", "Weight": 185, "Set 1": 8, "Set 2": 8, ... }
    private List<Map<String, Object>> workouts;

    // Each element mirrors an exported cardio row:
    // { "Date": "M/D/YY", "Exercise": "Running", "Set": 1, "Distance (mi)": 3.1, "Duration (sec)": 1800 }
    private List<Map<String, Object>> cardio;
}
