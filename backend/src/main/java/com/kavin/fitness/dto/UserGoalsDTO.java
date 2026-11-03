package com.kavin.fitness.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class UserGoalsDTO {

    @NotNull
    @Min(1)
    private Integer calorieTargetTraining;

    @NotNull
    @Min(1)
    private Integer calorieTargetRest;

    @NotNull
    @Min(1)
    private Integer proteinTarget;

    // Optional on update: older clients that don't send it keep the current goal.
    @Min(1)
    private Integer stepsTarget;

    public UserGoalsDTO() {}

    public UserGoalsDTO(
            int calorieTargetTraining, int calorieTargetRest, int proteinTarget, int stepsTarget) {
        this.calorieTargetTraining = calorieTargetTraining;
        this.calorieTargetRest = calorieTargetRest;
        this.proteinTarget = proteinTarget;
        this.stepsTarget = stepsTarget;
    }

    public Integer getCalorieTargetTraining() {
        return calorieTargetTraining;
    }

    public void setCalorieTargetTraining(Integer v) {
        this.calorieTargetTraining = v;
    }

    public Integer getCalorieTargetRest() {
        return calorieTargetRest;
    }

    public void setCalorieTargetRest(Integer v) {
        this.calorieTargetRest = v;
    }

    public Integer getProteinTarget() {
        return proteinTarget;
    }

    public void setProteinTarget(Integer v) {
        this.proteinTarget = v;
    }

    public Integer getStepsTarget() {
        return stepsTarget;
    }

    public void setStepsTarget(Integer v) {
        this.stepsTarget = v;
    }
}
