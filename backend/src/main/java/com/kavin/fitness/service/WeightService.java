package com.kavin.fitness.service;

import com.kavin.fitness.dto.WeightLogRequest;
import com.kavin.fitness.model.User;
import com.kavin.fitness.model.WeightLog;
import com.kavin.fitness.repository.WeightLogRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class WeightService {

    @Autowired
    private WeightLogRepository weightLogRepository;

    @Transactional(readOnly = true)
    public List<WeightLog> getWeightLog(Long userId) {
        return weightLogRepository.findByUserIdOrderByLogDateAsc(userId);
    }

    @Transactional
    public void delete(Long id, Long userId) {
        WeightLog log = weightLogRepository.findById(id)
                .filter(w -> w.getUser().getId().equals(userId))
                .orElseThrow(() -> new EntityNotFoundException("Weight log not found"));
        weightLogRepository.delete(log);
    }

    @Transactional
    public WeightLog save(User user, WeightLogRequest request) {
        WeightLog log = new WeightLog();
        log.setUser(user);
        log.setLogDate(request.getLogDate());
        log.setWeightLbs(request.getWeightLbs());
        return weightLogRepository.save(log);
    }
}
