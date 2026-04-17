package com.kavin.fitness.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "exercise_set")
@Getter @Setter @NoArgsConstructor
public class ExerciseSet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private WorkoutSession session;

    @Column(name = "exercise_name", nullable = false, length = 100)
    private String exerciseName;

    @Column(name = "set_number", nullable = false)
    private Integer setNumber;

    @Column(nullable = false)
    private Integer reps;

    @Column(name = "weight_lbs", nullable = false, precision = 6, scale = 1)
    private BigDecimal weightLbs;

    @Column(nullable = false)
    private Boolean completed = true;

    /** Cardio: distance in miles (nullable — only set for cardio exercises). */
    @Column(name = "distance_miles", precision = 6, scale = 2)
    private BigDecimal distanceMiles;

    /** Cardio: duration in seconds (nullable — only set for cardio exercises). */
    @Column(name = "duration_seconds")
    private Integer durationSeconds;
}
