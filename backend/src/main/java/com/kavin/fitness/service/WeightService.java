package com.kavin.fitness.service;

import com.kavin.fitness.dto.WeightLogDTO;
import com.kavin.fitness.dto.WeightLogRequest;
import com.kavin.fitness.model.User;
import com.kavin.fitness.model.WeightLog;
import com.kavin.fitness.repository.WeightLogRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class WeightService {

    @Autowired
    private WeightLogRepository weightLogRepository;

    @Transactional(readOnly = true)
    public List<WeightLogDTO> getWeightLog(Long userId) {
        return weightLogRepository.findByUserIdOrderByLogDateAsc(userId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional
    public void delete(Long id, Long userId) {
        WeightLog log = weightLogRepository.findById(id)
                .filter(w -> w.getUser().getId().equals(userId))
                .orElseThrow(() -> new EntityNotFoundException("Weight log not found"));
        weightLogRepository.delete(log);
    }

    @Transactional
    public WeightLogDTO save(User user, WeightLogRequest request) {
        WeightLog log = new WeightLog();
        log.setUser(user);
        log.setLogDate(request.getLogDate());
        log.setWeightLbs(request.getWeightLbs());
        return toDTO(weightLogRepository.save(log));
    }

    private WeightLogDTO toDTO(WeightLog log) {
        return new WeightLogDTO(log.getId(), log.getLogDate(), log.getWeightLbs());
    }
}
