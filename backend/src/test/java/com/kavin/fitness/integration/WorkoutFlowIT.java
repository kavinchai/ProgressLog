package com.kavin.fitness.integration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * A user logs a workout, adds exercises, renames the session,
 * reads it back, and deletes it. A second user cannot see or modify it.
 */
class WorkoutFlowIT extends IntegrationTestBase {

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = registerAndGetToken("workoutuser_" + 1, "pass1234");
    }

    @Test
    void logWorkout_readBack_rename_delete() throws Exception {
        // 1. Log a workout with exercises
        String workout = """
            {
                "sessionDate": "2026-04-01",
                "sessionName": "Push Day",
                "exercises": [
                    {
                        "exerciseName": "Bench Press",
                        "sets": [
                            {"setNumber": 1, "reps": 8, "weightLbs": 135},
                            {"setNumber": 2, "reps": 6, "weightLbs": 135}
                        ]
                    }
                ]
            }
            """;

        MvcResult createResult = mockMvc.perform(post("/api/workouts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(workout))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessionName").value("Push Day"))
                .andExpect(jsonPath("$.exerciseSets").isArray())
                .andExpect(jsonPath("$.exerciseSets.length()").value(2))
                .andExpect(jsonPath("$.exerciseSets[0].exerciseName").value("Bench Press"))
                .andReturn();

        long sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asLong();

        // 2. Read all workouts — should contain the one we just created
        mockMvc.perform(get("/api/workouts")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].sessionName").value("Push Day"));

        // 3. Rename the session
        mockMvc.perform(patch("/api/workouts/" + sessionId + "/name")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionName\": \"Upper Push\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionName").value("Upper Push"));

        // 4. Add another exercise to the same session
        String newExercise = """
            {
                "exerciseName": "OHP",
                "sets": [{"setNumber": 1, "reps": 10, "weightLbs": 65}]
            }
            """;

        mockMvc.perform(post("/api/workouts/" + sessionId + "/exercises")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(newExercise))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exerciseSets.length()").value(3));

        // 5. Delete an exercise
        mockMvc.perform(delete("/api/workouts/" + sessionId + "/exercises")
                        .header("Authorization", "Bearer " + token)
                        .param("name", "OHP"))
                .andExpect(status().isNoContent());

        // Verify only Bench Press sets remain
        mockMvc.perform(get("/api/workouts")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].exerciseSets.length()").value(2))
                .andExpect(jsonPath("$[0].exerciseSets[0].exerciseName").value("Bench Press"));

        // 6. Delete the session
        mockMvc.perform(delete("/api/workouts/" + sessionId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // Verify empty
        mockMvc.perform(get("/api/workouts")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void otherUser_cannotSeeOrDeleteWorkout() throws Exception {
        // User A logs a workout
        String workout = """
            {
                "sessionDate": "2026-04-02",
                "exercises": []
            }
            """;

        MvcResult result = mockMvc.perform(post("/api/workouts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(workout))
                .andExpect(status().isCreated())
                .andReturn();

        long sessionId = objectMapper.readTree(result.getResponse().getContentAsString())
                .get("id").asLong();

        // User B registers
        String tokenB = registerAndGetToken("otheruser_" + 1, "pass5678");

        // User B sees no workouts
        mockMvc.perform(get("/api/workouts")
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        // User B cannot delete User A's workout
        mockMvc.perform(delete("/api/workouts/" + sessionId)
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());
    }
}
