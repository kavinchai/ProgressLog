package com.kavin.fitness.repository;

import com.kavin.fitness.model.ExerciseSet;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ExerciseSetRepository extends JpaRepository<ExerciseSet, Long> {

    List<ExerciseSet> findBySessionId(Long sessionId);

    @Modifying
    @Query("DELETE FROM ExerciseSet e WHERE e.session.id = :sessionId")
    void deleteBySessionId(@Param("sessionId") Long sessionId);

    // Lift names only: older cardio rows (with a distance or duration) are left out.
    @Query(
            "SELECT DISTINCT e.exerciseName FROM ExerciseSet e "
                    + "JOIN e.session s WHERE s.user.id = :userId "
                    + "AND e.distanceMiles IS NULL AND e.durationSeconds IS NULL "
                    + "ORDER BY e.exerciseName ASC")
    List<String> findDistinctExerciseNamesByUserId(@Param("userId") Long userId);

    /** The viewer's lift names with how many of their sessions include each: [name, count]. */
    @Query(
            "SELECT e.exerciseName, COUNT(DISTINCT s.id) FROM ExerciseSet e "
                    + "JOIN e.session s WHERE s.user.id = :userId "
                    + "AND e.distanceMiles IS NULL AND e.durationSeconds IS NULL "
                    + "GROUP BY e.exerciseName")
    List<Object[]> countSessionsPerLiftName(@Param("userId") Long userId);

    /** Lift names logged by people who share on the leaderboard: [name, lifter count]. */
    @Query(
            "SELECT e.exerciseName, COUNT(DISTINCT s.user.id) FROM ExerciseSet e "
                    + "JOIN e.session s WHERE s.user.shareData = true "
                    + "AND e.distanceMiles IS NULL AND e.durationSeconds IS NULL "
                    + "GROUP BY e.exerciseName")
    List<Object[]> countSharersPerLiftName();

    @Query(
            "SELECT e FROM ExerciseSet e "
                    + "JOIN e.session s "
                    + "WHERE s.user.id = :userId AND e.exerciseName = :name "
                    + "ORDER BY s.sessionDate ASC, e.setNumber ASC")
    List<ExerciseSet> findByUserIdAndExerciseNameOrderByDate(
            @Param("userId") Long userId, @Param("name") String exerciseName);

    /** Returns all exercise sets for the given user IDs, joined with sessions for date access. */
    @Query(
            "SELECT e FROM ExerciseSet e "
                    + "JOIN FETCH e.session s "
                    + "WHERE s.user.id IN :userIds "
                    + "ORDER BY s.sessionDate ASC, e.exerciseName ASC")
    List<ExerciseSet> findByUserIdIn(@Param("userIds") List<Long> userIds);
}
