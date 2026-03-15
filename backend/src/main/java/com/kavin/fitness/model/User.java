package com.kavin.fitness.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String username;

    @Column(nullable = false, length = 255)
    private String password;

    @Column(length = 100)
    private String email;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "calorie_target_training", nullable = false)
    private int calorieTargetTraining = 2600;

    @Column(name = "calorie_target_rest", nullable = false)
    private int calorieTargetRest = 2000;

    @Column(name = "protein_target", nullable = false)
    private int proteinTarget = 180;
}
