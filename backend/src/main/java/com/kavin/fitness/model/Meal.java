package com.kavin.fitness.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "meal")
@Getter
@Setter
@NoArgsConstructor
public class Meal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "nutrition_log_id", nullable = false)
    private NutritionLog nutritionLog;

    @Column(name = "meal_label", length = 50)
    private String mealLabel; // "Breakfast" | "Lunch" | "Dinner" | user-chosen

    @Column(name = "meal_name", length = 100)
    private String mealName; // what was eaten

    @Column(nullable = false)
    private Integer calories;

    @Column(name = "protein_grams", nullable = false)
    private Integer proteinGrams;
}
