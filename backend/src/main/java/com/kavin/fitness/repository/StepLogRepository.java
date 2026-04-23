package com.kavin.fitness.repository;

import com.kavin.fitness.model.StepLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface StepLogRepository extends JpaRepository<StepLog, Long> {

    List<StepLog> findByUserIdOrderByLogDateAsc(Long userId);

    Optional<StepLog> findByUserIdAndLogDate(Long userId, LocalDate logDate);
}
