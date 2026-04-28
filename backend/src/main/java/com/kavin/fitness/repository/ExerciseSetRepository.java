package com.kavin.fitness.repository;

import com.kavin.fitness.model.ExerciseSet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
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

    /** Returns [exerciseName, maxWeightLbs] for every exercise the user has logged. */
    @Query("SELECT e.exerciseName, MAX(e.weightLbs) " +
           "FROM ExerciseSet e JOIN e.session s " +
           "WHERE s.user.id = :userId " +
           "GROUP BY e.exerciseName")
    List<Object[]> findMaxWeightPerExercise(@Param("userId") Long userId);

    /** Returns all cardio exercise sets (those with a non-null distanceMiles) for a user, ordered by date. */
    @Query("SELECT e FROM ExerciseSet e " +
           "JOIN e.session s " +
           "WHERE s.user.id = :userId AND e.distanceMiles IS NOT NULL " +
           "ORDER BY s.sessionDate ASC, e.exerciseName ASC, e.setNumber ASC")
    List<ExerciseSet> findCardioSetsByUserId(@Param("userId") Long userId);

    /** Returns the earliest session date on which the user lifted a given weight for an exercise. */
    @Query("SELECT MIN(s.sessionDate) " +
           "FROM ExerciseSet e JOIN e.session s " +
           "WHERE s.user.id = :userId AND e.exerciseName = :name AND e.weightLbs = :weight")
    LocalDate findFirstDateForMaxWeight(
            @Param("userId") Long userId,
            @Param("name") String name,
            @Param("weight") BigDecimal weight);
}
