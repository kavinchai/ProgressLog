package com.kavin.fitness.repository;

import com.kavin.fitness.model.WorkoutSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, Long> {

    List<WorkoutSession> findByUserIdOrderBySessionDateAsc(Long userId);

    boolean existsByUserIdAndSessionDate(Long userId, LocalDate sessionDate);

    List<WorkoutSession> findByUserIdAndSessionDate(Long userId, LocalDate sessionDate);

    @Modifying
    @Query("DELETE FROM ExerciseSet e WHERE e.session.id IN " +
           "(SELECT s.id FROM WorkoutSession s WHERE s.user.id = :userId AND s.sessionDate = :date)")
    void bulkDeleteExerciseSetsByUserAndDate(@Param("userId") Long userId, @Param("date") LocalDate date);

    @Modifying
    @Query("DELETE FROM WorkoutSession s WHERE s.user.id = :userId AND s.sessionDate = :date")
    void deleteByUserIdAndSessionDate(@Param("userId") Long userId, @Param("date") LocalDate date);

    @Query("SELECT DISTINCT s FROM WorkoutSession s " +
           "LEFT JOIN FETCH s.exerciseSets " +
           "WHERE s.user.id = :userId " +
           "ORDER BY s.sessionDate ASC")
    List<WorkoutSession> findByUserIdWithSetsOrderByDateAsc(@Param("userId") Long userId);
}
