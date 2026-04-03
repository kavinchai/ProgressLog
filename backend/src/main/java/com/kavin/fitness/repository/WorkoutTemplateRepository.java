package com.kavin.fitness.repository;

import com.kavin.fitness.model.WorkoutTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkoutTemplateRepository extends JpaRepository<WorkoutTemplate, Long> {

    @Query("SELECT DISTINCT t FROM WorkoutTemplate t LEFT JOIN FETCH t.exercises " +
           "WHERE t.user.id = :userId ORDER BY t.id ASC")
    List<WorkoutTemplate> findByUserIdWithExercises(@Param("userId") Long userId);
}
