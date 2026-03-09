package com.kavin.fitness.repository;

import com.kavin.fitness.model.Meal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MealRepository extends JpaRepository<Meal, Long> {
    List<Meal> findByNutritionLogId(Long nutritionLogId);
}
