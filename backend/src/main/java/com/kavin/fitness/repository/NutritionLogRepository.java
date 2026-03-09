package com.kavin.fitness.repository;

import com.kavin.fitness.model.NutritionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface NutritionLogRepository extends JpaRepository<NutritionLog, Long> {

    @Query("SELECT DISTINCT n FROM NutritionLog n LEFT JOIN FETCH n.meals " +
           "WHERE n.user.id = :userId ORDER BY n.logDate ASC")
    List<NutritionLog> findByUserIdWithMealsOrderByLogDateAsc(@Param("userId") Long userId);

    Optional<NutritionLog> findByUserIdAndLogDate(Long userId, LocalDate logDate);
}
