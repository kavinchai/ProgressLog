package com.kavin.fitness.service;

import com.kavin.fitness.dto.ExerciseRequest;
import com.kavin.fitness.dto.WorkoutTemplateDTO;
import com.kavin.fitness.dto.WorkoutTemplateRequest;
import com.kavin.fitness.model.TemplateExercise;
import com.kavin.fitness.model.User;
import com.kavin.fitness.model.WorkoutTemplate;
import com.kavin.fitness.repository.WorkoutTemplateRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class WorkoutTemplateService {

    @Autowired
    private WorkoutTemplateRepository templateRepository;

    @Transactional(readOnly = true)
    public List<WorkoutTemplateDTO> getTemplates(Long userId) {
        return templateRepository.findByUserIdWithExercises(userId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional
    public WorkoutTemplateDTO create(User user, WorkoutTemplateRequest request) {
        WorkoutTemplate template = new WorkoutTemplate();
        template.setUser(user);
        template.setName(request.getName().trim());
        addExercises(template, request.getExercises());
        return toDTO(templateRepository.save(template));
    }

    @Transactional
    public WorkoutTemplateDTO update(Long templateId, Long userId, WorkoutTemplateRequest request) {
        WorkoutTemplate template = resolveTemplate(templateId, userId);
        template.setName(request.getName().trim());
        template.getExercises().clear();
        addExercises(template, request.getExercises());
        return toDTO(templateRepository.save(template));
    }

    @Transactional
    public void delete(Long templateId, Long userId) {
        WorkoutTemplate template = resolveTemplate(templateId, userId);
        templateRepository.delete(template);
    }

    @Transactional
    public List<WorkoutTemplateDTO> importAll(User user, List<WorkoutTemplateRequest> requests) {
        return requests.stream()
                .map(r -> create(user, r))
                .collect(Collectors.toList());
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private void addExercises(WorkoutTemplate template, List<ExerciseRequest> exerciseRequests) {
        if (exerciseRequests == null) return;
        for (ExerciseRequest exerciseRequest : exerciseRequests) {
            for (ExerciseRequest.SetRequest setRequest : exerciseRequest.getSets()) {
                TemplateExercise te = new TemplateExercise();
                te.setTemplate(template);
                te.setExerciseName(exerciseRequest.getExerciseName());
                te.setSetNumber(setRequest.getSetNumber());
                te.setReps(setRequest.getReps());
                te.setWeightLbs(setRequest.getWeightLbs());
                template.getExercises().add(te);
            }
        }
    }

    private WorkoutTemplate resolveTemplate(Long templateId, Long userId) {
        return templateRepository.findById(templateId)
                .filter(t -> t.getUser().getId().equals(userId))
                .orElseThrow(() -> new IllegalArgumentException("Template not found"));
    }

    private WorkoutTemplateDTO toDTO(WorkoutTemplate template) {
        LinkedHashMap<String, List<WorkoutTemplateDTO.SetDTO>> grouped = new LinkedHashMap<>();
        template.getExercises().stream()
                .sorted(Comparator.comparingInt(TemplateExercise::getSetNumber))
                .forEach(te -> grouped
                        .computeIfAbsent(te.getExerciseName(), k -> new ArrayList<>())
                        .add(new WorkoutTemplateDTO.SetDTO(
                                te.getSetNumber(), te.getReps(), te.getWeightLbs())));

        List<WorkoutTemplateDTO.ExerciseDTO> exercises = grouped.entrySet().stream()
                .map(e -> new WorkoutTemplateDTO.ExerciseDTO(e.getKey(), e.getValue()))
                .collect(Collectors.toList());

        return new WorkoutTemplateDTO(template.getId(), template.getName(), exercises);
    }
}
