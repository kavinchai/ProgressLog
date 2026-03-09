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
@Table(name = "nutrition_log",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "log_date"}))
@Getter @Setter @NoArgsConstructor
public class NutritionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "log_date", nullable = false)
    private LocalDate logDate;

    /** Kept nullable for legacy rows; new rows use meals for totals. */
    @Column
    private Integer calories;

    @Column(name = "protein_grams")
    private Integer proteinGrams;

    @Column(name = "day_type", nullable = false, length = 20)
    private String dayType;   // "training" | "rest"

    @Column
    private Integer steps;

    @OneToMany(mappedBy = "nutritionLog", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Meal> meals = new ArrayList<>();
}
