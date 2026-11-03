package com.kavin.fitness.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.kavin.fitness.dto.UserGoalsDTO;
import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;

@ExtendWith(MockitoExtension.class)
class ProfileControllerGoalsTest {

    @Mock UserRepository userRepository;
    @Mock UserResolver userResolver;
    @Mock UserDetails principal;
    @InjectMocks ProfileController controller;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setUsername("testuser");
        when(userResolver.resolve(principal)).thenReturn(user);
    }

    @Test
    void getGoals_includesDefaultStepsTarget() {
        UserGoalsDTO goals = controller.getGoals(principal).getBody();

        assertEquals(10000, goals.getStepsTarget());
    }

    @Test
    void updateGoals_savesStepsTarget() {
        UserGoalsDTO body = controller.updateGoals(principal, goalsDto(8000)).getBody();

        assertEquals(8000, user.getStepsTarget());
        assertEquals(8000, body.getStepsTarget());
        verify(userRepository).save(user);
    }

    @Test
    void updateGoals_withoutStepsTarget_keepsTheCurrentOne() {
        user.setStepsTarget(7500);

        UserGoalsDTO body = controller.updateGoals(principal, goalsDto(null)).getBody();

        assertEquals(7500, user.getStepsTarget());
        assertEquals(7500, body.getStepsTarget());
        assertEquals(2800, body.getCalorieTargetTraining());
    }

    private UserGoalsDTO goalsDto(Integer stepsTarget) {
        UserGoalsDTO dto = new UserGoalsDTO();
        dto.setCalorieTargetTraining(2800);
        dto.setCalorieTargetRest(2000);
        dto.setProteinTarget(180);
        dto.setStepsTarget(stepsTarget);
        return dto;
    }
}
