package com.kavin.fitness.service;

import com.kavin.fitness.dto.ExerciseRequest;
import com.kavin.fitness.dto.WorkoutTemplateDTO;
import com.kavin.fitness.dto.WorkoutTemplateRequest;
import com.kavin.fitness.model.TemplateExercise;
import com.kavin.fitness.model.User;
import com.kavin.fitness.model.WorkoutTemplate;
import com.kavin.fitness.repository.WorkoutTemplateRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkoutTemplateServiceTest {

    @Mock WorkoutTemplateRepository templateRepository;
    @InjectMocks WorkoutTemplateService templateService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setUsername("testuser");
        ReflectionTestUtils.setField(user, "id", 1L);
    }

    // ── getTemplates ─────────────────────────────────────────────────────────

    @Test
    void getTemplates_returnsEmptyListWhenNone() {
        when(templateRepository.findByUserIdWithExercises(1L)).thenReturn(List.of());

        assertTrue(templateService.getTemplates(1L).isEmpty());
    }

    @Test
    void getTemplates_mapsTemplatesToDTOs() {
        WorkoutTemplate template = templateWithExercise(10L, "Push Day", "Bench Press", 1, 8, "135");
        when(templateRepository.findByUserIdWithExercises(1L)).thenReturn(List.of(template));

        List<WorkoutTemplateDTO> result = templateService.getTemplates(1L);

        assertEquals(1, result.size());
        assertEquals("Push Day", result.get(0).getName());
        assertEquals(1, result.get(0).getExercises().size());
        assertEquals("Bench Press", result.get(0).getExercises().get(0).getExerciseName());
    }

    @Test
    void getTemplates_groupsSetsByExerciseName() {
        WorkoutTemplate template = emptyTemplate(10L, "Push Day");
        addExercise(template, "Bench Press", 1, 8, "135");
        addExercise(template, "Bench Press", 2, 8, "135");
        addExercise(template, "OHP", 1, 10, "65");

        when(templateRepository.findByUserIdWithExercises(1L)).thenReturn(List.of(template));

        List<WorkoutTemplateDTO> result = templateService.getTemplates(1L);
        WorkoutTemplateDTO dto = result.get(0);

        assertEquals(2, dto.getExercises().size());
        assertEquals("Bench Press", dto.getExercises().get(0).getExerciseName());
        assertEquals(2, dto.getExercises().get(0).getSets().size());
        assertEquals("OHP", dto.getExercises().get(1).getExerciseName());
        assertEquals(1, dto.getExercises().get(1).getSets().size());
    }

    // ── create ───────────────────────────────────────────────────────────────

    @Test
    void create_savesTemplateWithExercises() {
        ExerciseRequest.SetRequest sr = new ExerciseRequest.SetRequest();
        sr.setSetNumber(1);
        sr.setReps(10);
        sr.setWeightLbs(BigDecimal.valueOf(100));

        ExerciseRequest ex = new ExerciseRequest();
        ex.setExerciseName("Squat");
        ex.setSets(List.of(sr));

        WorkoutTemplateRequest request = new WorkoutTemplateRequest();
        request.setName("Leg Day");
        request.setExercises(List.of(ex));

        when(templateRepository.save(any())).thenAnswer(inv -> {
            WorkoutTemplate t = inv.getArgument(0);
            ReflectionTestUtils.setField(t, "id", 5L);
            return t;
        });

        WorkoutTemplateDTO dto = templateService.create(user, request);

        assertEquals(5L, dto.getId());
        assertEquals("Leg Day", dto.getName());
        assertEquals(1, dto.getExercises().size());
        assertEquals("Squat", dto.getExercises().get(0).getExerciseName());
    }

    @Test
    void create_handlesNullExercisesList() {
        WorkoutTemplateRequest request = new WorkoutTemplateRequest();
        request.setName("Empty Template");
        request.setExercises(null);

        when(templateRepository.save(any())).thenAnswer(inv -> {
            WorkoutTemplate t = inv.getArgument(0);
            ReflectionTestUtils.setField(t, "id", 6L);
            return t;
        });

        WorkoutTemplateDTO dto = templateService.create(user, request);

        assertEquals("Empty Template", dto.getName());
        assertTrue(dto.getExercises().isEmpty());
    }

    @Test
    void create_trimsTemplateName() {
        WorkoutTemplateRequest request = new WorkoutTemplateRequest();
        request.setName("  Push Day  ");
        request.setExercises(List.of());

        when(templateRepository.save(any())).thenAnswer(inv -> {
            WorkoutTemplate t = inv.getArgument(0);
            ReflectionTestUtils.setField(t, "id", 7L);
            return t;
        });

        WorkoutTemplateDTO dto = templateService.create(user, request);
        assertEquals("Push Day", dto.getName());
    }

    // ── update ───────────────────────────────────────────────────────────────

    @Test
    void update_replacesNameAndExercises() {
        WorkoutTemplate existing = templateWithExercise(10L, "Old Name", "OHP", 1, 8, "65");
        when(templateRepository.findById(10L)).thenReturn(Optional.of(existing));
        when(templateRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ExerciseRequest.SetRequest sr = new ExerciseRequest.SetRequest();
        sr.setSetNumber(1);
        sr.setReps(5);
        sr.setWeightLbs(BigDecimal.valueOf(225));

        ExerciseRequest ex = new ExerciseRequest();
        ex.setExerciseName("Deadlift");
        ex.setSets(List.of(sr));

        WorkoutTemplateRequest request = new WorkoutTemplateRequest();
        request.setName("New Name");
        request.setExercises(List.of(ex));

        WorkoutTemplateDTO dto = templateService.update(10L, 1L, request);

        assertEquals("New Name", dto.getName());
        assertEquals(1, dto.getExercises().size());
        assertEquals("Deadlift", dto.getExercises().get(0).getExerciseName());
    }

    @Test
    void update_throwsWhenTemplateNotFound() {
        when(templateRepository.findById(99L)).thenReturn(Optional.empty());

        WorkoutTemplateRequest request = new WorkoutTemplateRequest();
        request.setName("X");
        request.setExercises(List.of());

        assertThrows(EntityNotFoundException.class,
                () -> templateService.update(99L, 1L, request));
    }

    @Test
    void update_throwsWhenTemplateBelongsToAnotherUser() {
        WorkoutTemplate template = emptyTemplate(10L, "Push Day");
        when(templateRepository.findById(10L)).thenReturn(Optional.of(template));

        WorkoutTemplateRequest request = new WorkoutTemplateRequest();
        request.setName("X");
        request.setExercises(List.of());

        assertThrows(EntityNotFoundException.class,
                () -> templateService.update(10L, 999L, request));
    }

    // ── delete ───────────────────────────────────────────────────────────────

    @Test
    void delete_removesTemplateOwnedByUser() {
        WorkoutTemplate template = emptyTemplate(10L, "Push Day");
        when(templateRepository.findById(10L)).thenReturn(Optional.of(template));

        templateService.delete(10L, 1L);

        verify(templateRepository).delete(template);
    }

    @Test
    void delete_throwsWhenTemplateNotFound() {
        when(templateRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> templateService.delete(99L, 1L));
    }

    // ── importAll ────────────────────────────────────────────────────────────

    @Test
    void importAll_createsMultipleTemplates() {
        WorkoutTemplateRequest r1 = new WorkoutTemplateRequest();
        r1.setName("Push");
        r1.setExercises(List.of());

        WorkoutTemplateRequest r2 = new WorkoutTemplateRequest();
        r2.setName("Pull");
        r2.setExercises(List.of());

        long[] idCounter = {1L};
        when(templateRepository.save(any())).thenAnswer(inv -> {
            WorkoutTemplate t = inv.getArgument(0);
            ReflectionTestUtils.setField(t, "id", idCounter[0]++);
            return t;
        });

        List<WorkoutTemplateDTO> result = templateService.importAll(user, List.of(r1, r2));

        assertEquals(2, result.size());
        assertEquals("Push", result.get(0).getName());
        assertEquals("Pull", result.get(1).getName());
        verify(templateRepository, times(2)).save(any());
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private WorkoutTemplate emptyTemplate(Long id, String name) {
        WorkoutTemplate t = new WorkoutTemplate();
        ReflectionTestUtils.setField(t, "id", id);
        t.setUser(user);
        t.setName(name);
        t.setExercises(new ArrayList<>());
        return t;
    }

    private WorkoutTemplate templateWithExercise(Long id, String name,
                                                  String exerciseName, int setNum, int reps, String weight) {
        WorkoutTemplate t = emptyTemplate(id, name);
        addExercise(t, exerciseName, setNum, reps, weight);
        return t;
    }

    private void addExercise(WorkoutTemplate template, String exerciseName,
                             int setNum, int reps, String weight) {
        TemplateExercise te = new TemplateExercise();
        te.setTemplate(template);
        te.setExerciseName(exerciseName);
        te.setSetNumber(setNum);
        te.setReps(reps);
        te.setWeightLbs(new BigDecimal(weight));
        template.getExercises().add(te);
    }
}
