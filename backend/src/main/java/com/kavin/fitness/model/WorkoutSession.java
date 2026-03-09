package com.kavin.fitness.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "workout_session")
@Getter @Setter @NoArgsConstructor
public class WorkoutSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore


    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "session_date", nullable = false)
    private LocalDate sessionDate;

    /** Legacy field — nullable; new sessions leave this null. */
    @Column(name = "session_name", length = 100)
    private String sessionName;

    /** Legacy field — nullable; new sessions leave this null. */
    @Column(name = "completion_pct")
    private Integer completionPct;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ExerciseSet> exerciseSets = new ArrayList<>();
}
