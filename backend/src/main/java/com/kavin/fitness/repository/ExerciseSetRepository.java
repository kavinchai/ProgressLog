package com.kavin.fitness.repository;

import com.kavin.fitness.model.ExerciseSet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExerciseSetRepository extends JpaRepository<ExerciseSet, Long> {

    List<ExerciseSet> findBySessionId(Long sessionId);

    @Query("SELECT DISTINCT e.exerciseName FROM ExerciseSet e " +
           "JOIN e.session s WHERE s.user.id = :userId " +
           "ORDER BY e.exerciseName ASC")
    List<String> findDistinctExerciseNamesByUserId(@Param("userId") Long userId);

    @Query("SELECT e FROM ExerciseSet e " +
           "JOIN e.session s " +
           "WHERE s.user.id = :userId AND e.exerciseName = :name " +
           "ORDER BY s.sessionDate ASC, e.setNumber ASC")
    List<ExerciseSet> findByUserIdAndExerciseNameOrderByDate(
            @Param("userId") Long userId,
            @Param("name") String exerciseName);
}
