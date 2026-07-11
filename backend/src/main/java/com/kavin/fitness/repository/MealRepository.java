package com.kavin.fitness.repository;

import com.kavin.fitness.model.Meal;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MealRepository extends JpaRepository<Meal, Long> {
    List<Meal> findByNutritionLogId(Long nutritionLogId);
}
