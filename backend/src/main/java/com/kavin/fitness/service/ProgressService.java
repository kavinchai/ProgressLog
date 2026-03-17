package com.kavin.fitness.service;

import com.kavin.fitness.dto.MilestoneDTO;
import com.kavin.fitness.dto.StrengthProgressDTO;
import com.kavin.fitness.model.ExerciseSet;
import com.kavin.fitness.repository.ExerciseSetRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ProgressService {

    // Key lifts to highlight in the UI
    private static final List<String> KEY_LIFTS = List.of(
            "Bench Press",
            "Lat Pulldowns",
            "Squats",
            "Romanian Deadlifts",
            "Incline DB Press"
    );

    @Autowired
    private ExerciseSetRepository exerciseSetRepository;

    public List<StrengthProgressDTO> getStrengthProgress(Long userId) {
        List<String> allExercises = exerciseSetRepository.findDistinctExerciseNamesByUserId(userId);

        // Show key lifts first, then any others
        List<String> ordered = new ArrayList<>(KEY_LIFTS);
        allExercises.stream()
                .filter(exerciseName -> !ordered.contains(exerciseName))
                .forEach(ordered::add);

        List<StrengthProgressDTO> result = new ArrayList<>();
        for (String name : ordered) {
            List<ExerciseSet> sets =
                    exerciseSetRepository.findByUserIdAndExerciseNameOrderByDate(userId, name);
            if (sets.isEmpty()) continue;

            // Group by session date, then by weight descending
            Map<LocalDate, List<ExerciseSet>> byDate = sets.stream()
                    .collect(Collectors.groupingBy(
                            set -> set.getSession().getSessionDate(),
                            TreeMap::new,
                            Collectors.toList()));

            List<StrengthProgressDTO.SessionData> sessionDataList = byDate.entrySet().stream()
                    .flatMap(entry -> {
                        LocalDate date = entry.getKey();
                        Map<BigDecimal, List<ExerciseSet>> byWeight = entry.getValue().stream()
                                .collect(Collectors.groupingBy(ExerciseSet::getWeightLbs));
                        return byWeight.entrySet().stream()
                                .sorted(Map.Entry.<BigDecimal, List<ExerciseSet>>comparingByKey().reversed())
                                .map(weightEntry -> {
                                    BigDecimal weight = weightEntry.getKey();
                                    List<ExerciseSet> weightSets = weightEntry.getValue();
                                    String repScheme = weightSets.stream()
                                            .map(set -> String.valueOf(set.getReps()))
                                            .collect(Collectors.joining("/"));
                                    return new StrengthProgressDTO.SessionData(
                                            date,
                                            weight,
                                            weightSets.size(),
                                            repScheme);
                                });
                    })
                    .collect(Collectors.toList());

            result.add(new StrengthProgressDTO(name, sessionDataList));
        }
        return result;
    }

    public List<MilestoneDTO> getMilestones(Long userId) {
        // Milestones derived from seed data; extend with DB-driven logic as needed
        List<MilestoneDTO> milestones = new ArrayList<>();
        long id = 1;

        milestones.add(new MilestoneDTO(id++, LocalDate.of(2026, 2, 25), "milestone",
                "Transformation Begins",
                "Started 11-week lean bulk-to-cut at 149.0 lbs. Target: 149.5–150 lbs at 11–13% BF by May 20."));

        milestones.add(new MilestoneDTO(id++, LocalDate.of(2026, 2, 25), "achievement",
                "Push Day Kickoff — 85% Complete",
                "Bench Press 135 lbs × 6/6/6/5/3. Solid first session establishing baseline for progressive overload."));

        milestones.add(new MilestoneDTO(id++, LocalDate.of(2026, 2, 26), "achievement",
                "Pull Day — 90% Complete",
                "Lat Pulldowns at 84 lbs. Strong start on pulling strength. 90% completion rate."));

        milestones.add(new MilestoneDTO(id++, LocalDate.of(2026, 3, 1), "achievement",
                "First 100% Pull Session",
                "Lat Pulldowns jumped to 96 lbs (+12 lbs). Full session completion on Pull day."));

        milestones.add(new MilestoneDTO(id++, LocalDate.of(2026, 3, 2), "achievement",
                "Rest/Accessory Day — 100% Complete",
                "19,000 steps. Full accessory work completed. Highest step count in the tracked period."));

        milestones.add(new MilestoneDTO(id++, LocalDate.of(2026, 3, 4), "setback",
                "Pull Day — Only 50% Complete",
                "Session cut short at 50% completion. Lat Pulldowns stayed at 96 lbs. Recovery or fatigue issue."));

        milestones.add(new MilestoneDTO(id++, LocalDate.of(2026, 3, 5), "achievement",
                "Lat Pulldowns +24 lbs in ~8 Days",
                "Makeup Pull session: Lat Pulldowns reached 108 lbs (+24 lbs from 84). Exceptional strength progression."));

        milestones.add(new MilestoneDTO(id++, LocalDate.of(2026, 3, 6), "achievement",
                "Squats & RDL +10 lbs",
                "Squats progressed to 115 lbs (+10). Romanian Deadlifts to 115 lbs (+10). Both hit on the same Legs day."));

        milestones.add(new MilestoneDTO(id++, LocalDate.of(2026, 3, 7), "setback",
                "Upper Day Skipped — 0% Complete",
                "Scheduled Upper day fully skipped. Triggered a makeup session the following day."));

        milestones.add(new MilestoneDTO(id++, LocalDate.of(2026, 3, 8), "achievement",
                "Bench Press Rep PR — 7/6/6/6/5",
                "Upper Makeup: Bench Press now 7/6/6/6/5 at 135 lbs (up from 6/6/6/5/3). Attempted 145 lbs for the first time."));

        return milestones;
    }
}
