package com.kavin.fitness.repository;

import com.kavin.fitness.model.WeightLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface WeightLogRepository extends JpaRepository<WeightLog, Long> {

    List<WeightLog> findByUserIdOrderByLogDateAsc(Long userId);

    boolean existsByUserIdAndLogDate(Long userId, LocalDate logDate);

    java.util.Optional<WeightLog> findByUserIdAndLogDate(Long userId, LocalDate logDate);
}
