package com.kavin.fitness.service;

import com.kavin.fitness.dto.StepLogDTO;
import com.kavin.fitness.dto.StepLogRequest;
import com.kavin.fitness.model.StepLog;
import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.StepLogRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class StepService {

    @Autowired
    private StepLogRepository stepLogRepository;

    @Transactional(readOnly = true)
    public List<StepLogDTO> getStepLogs(Long userId) {
        return stepLogRepository.findByUserIdOrderByLogDateAsc(userId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional
    public StepLogDTO save(User user, StepLogRequest request) {
        StepLog log = stepLogRepository
                .findByUserIdAndLogDate(user.getId(), request.getLogDate())
                .orElseGet(StepLog::new);
        log.setUser(user);
        log.setLogDate(request.getLogDate());
        log.setSteps(request.getSteps());
        return toDTO(stepLogRepository.save(log));
    }

    private StepLogDTO toDTO(StepLog log) {
        return new StepLogDTO(log.getId(), log.getLogDate(), log.getSteps());
    }

    @Transactional
    public void delete(Long id, Long userId) {
        StepLog log = stepLogRepository.findById(id)
                .filter(s -> s.getUser().getId().equals(userId))
                .orElseThrow(() -> new EntityNotFoundException("Step log not found"));
        stepLogRepository.delete(log);
    }
}
