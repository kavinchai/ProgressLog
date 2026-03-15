package com.kavin.fitness.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class UserGoalsDTO {

    @NotNull @Min(1)
    private Integer calorieTargetTraining;

    @NotNull @Min(1)
    private Integer calorieTargetRest;

    @NotNull @Min(1)
    private Integer proteinTarget;

    public UserGoalsDTO() {}

    public UserGoalsDTO(int calorieTargetTraining, int calorieTargetRest, int proteinTarget) {
        this.calorieTargetTraining = calorieTargetTraining;
        this.calorieTargetRest     = calorieTargetRest;
        this.proteinTarget         = proteinTarget;
    }

    public Integer getCalorieTargetTraining() { return calorieTargetTraining; }
    public void setCalorieTargetTraining(Integer v) { this.calorieTargetTraining = v; }

    public Integer getCalorieTargetRest() { return calorieTargetRest; }
    public void setCalorieTargetRest(Integer v) { this.calorieTargetRest = v; }

    public Integer getProteinTarget() { return proteinTarget; }
    public void setProteinTarget(Integer v) { this.proteinTarget = v; }
}
