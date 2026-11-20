package com.kavin.fitness.repository;

import com.kavin.fitness.model.PasswordResetCode;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PasswordResetCodeRepository extends JpaRepository<PasswordResetCode, Long> {

    Optional<PasswordResetCode> findFirstByUserIdOrderByCreatedAtDesc(Long userId);

    void deleteByUserId(Long userId);
}
