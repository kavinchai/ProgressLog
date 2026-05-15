package com.kavin.fitness.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Exercises the deletion-journal / undo flow end-to-end for every
 * MCP-exposed destructive op. Each scenario: log → delete → undo →
 * verify the data is back. IDs are allowed to change on restore.
 */
class UndoFlowIT extends IntegrationTestBase {

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = registerAndGetToken("undouser_" + 1, "pass1234");
    }

    @Test
    void undo_restoresDeletedWorkoutSession_withExercises() throws Exception {
        String workout = """
            {
                "sessionDate": "2026-04-01",
                "sessionName": "Push Day",
                "exercises": [
                    {
                        "exerciseName": "Bench Press",
                        "sets": [
                            {"setNumber": 1, "reps": 8, "weightLbs": 135},
                            {"setNumber": 2, "reps": 6, "weightLbs": 145}
                        ]
                    },
                    {
                        "exerciseName": "OHP",
                        "sets": [{"setNumber": 1, "reps": 10, "weightLbs": 65}]
                    }
                ]
            }
            """;

        MvcResult created = mockMvc.perform(post("/api/workouts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(workout))
                .andExpect(status().isCreated())
                .andReturn();

        long sessionId = objectMapper.readTree(created.getResponse().getContentAsString())
                .get("id").asLong();

        // Delete the workout
        mockMvc.perform(delete("/api/workouts/" + sessionId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // Confirm it's gone
        mockMvc.perform(get("/api/workouts")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(0));

        // Undo
        mockMvc.perform(post("/api/undo")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entityType").value("workout_session"))
                .andExpect(jsonPath("$.summary").exists());

        // Workout is back with same content (new ID is fine)
        mockMvc.perform(get("/api/workouts")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].sessionDate").value("2026-04-01"))
                .andExpect(jsonPath("$[0].sessionName").value("Push Day"))
                .andExpect(jsonPath("$[0].exerciseSets.length()").value(3));
    }

    @Test
    void undo_restoresDeletedExerciseSets_withinSession() throws Exception {
        String workout = """
            {
                "sessionDate": "2026-04-02",
                "exercises": [
                    {
                        "exerciseName": "Squat",
                        "sets": [{"setNumber": 1, "reps": 5, "weightLbs": 225}]
                    },
                    {
                        "exerciseName": "Deadlift",
                        "sets": [{"setNumber": 1, "reps": 3, "weightLbs": 315}]
                    }
                ]
            }
            """;

        MvcResult created = mockMvc.perform(post("/api/workouts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(workout))
                .andExpect(status().isCreated())
                .andReturn();

        long sessionId = objectMapper.readTree(created.getResponse().getContentAsString())
                .get("id").asLong();

        // Delete Deadlift sets
        mockMvc.perform(delete("/api/workouts/" + sessionId + "/exercises")
                        .header("Authorization", "Bearer " + token)
                        .param("name", "Deadlift"))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/workouts/" + sessionId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.exerciseSets.length()").value(1))
                .andExpect(jsonPath("$.exerciseSets[0].exerciseName").value("Squat"));

        // Undo
        mockMvc.perform(post("/api/undo")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entityType").value("exercise_set"));

        // Deadlift is back
        mockMvc.perform(get("/api/workouts/" + sessionId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.exerciseSets.length()").value(2));
    }

    @Test
    void undo_restoresDeletedNutritionLog_withMeals() throws Exception {
        // Create nutrition log
        MvcResult logRes = mockMvc.perform(post("/api/nutrition")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"logDate": "2026-05-10", "dayType": "training"}
                        """))
                .andExpect(status().isCreated())
                .andReturn();
        long logId = objectMapper.readTree(logRes.getResponse().getContentAsString())
                .get("id").asLong();

        // Add two meals
        mockMvc.perform(post("/api/nutrition/" + logId + "/meals")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"mealName": "Breakfast", "calories": 500, "proteinGrams": 35}
                        """))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/nutrition/" + logId + "/meals")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"mealName": "Lunch", "calories": 700, "proteinGrams": 40}
                        """))
                .andExpect(status().isOk());

        // Delete the entire day log
        mockMvc.perform(delete("/api/nutrition/" + logId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/nutrition")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(0));

        // Undo
        mockMvc.perform(post("/api/undo")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entityType").value("nutrition_log"));

        // Log + both meals are back
        mockMvc.perform(get("/api/nutrition")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].logDate").value("2026-05-10"))
                .andExpect(jsonPath("$[0].dayType").value("training"))
                .andExpect(jsonPath("$[0].meals.length()").value(2))
                .andExpect(jsonPath("$[0].totalCalories").value(1200));
    }

    @Test
    void undo_restoresDeletedMeal() throws Exception {
        MvcResult logRes = mockMvc.perform(post("/api/nutrition")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"logDate": "2026-05-11", "dayType": "training"}
                        """))
                .andExpect(status().isCreated())
                .andReturn();
        long logId = objectMapper.readTree(logRes.getResponse().getContentAsString())
                .get("id").asLong();

        MvcResult mealRes = mockMvc.perform(post("/api/nutrition/" + logId + "/meals")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"mealName": "Lunch", "calories": 600, "proteinGrams": 30}
                        """))
                .andExpect(status().isOk())
                .andReturn();

        // Find the meal id
        JsonNode meals = objectMapper.readTree(mealRes.getResponse().getContentAsString()).get("meals");
        long mealId = meals.get(0).get("id").asLong();

        // Delete that meal
        mockMvc.perform(delete("/api/nutrition/" + logId + "/meals/" + mealId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/nutrition")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].meals.length()").value(0));

        // Undo
        mockMvc.perform(post("/api/undo")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entityType").value("meal"));

        mockMvc.perform(get("/api/nutrition")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].meals.length()").value(1))
                .andExpect(jsonPath("$[0].meals[0].mealName").value("Lunch"))
                .andExpect(jsonPath("$[0].meals[0].calories").value(600));
    }

    @Test
    void undo_restoresDeletedStepLog() throws Exception {
        MvcResult logRes = mockMvc.perform(post("/api/steps")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"logDate": "2026-05-12", "steps": 8500}
                        """))
                .andExpect(status().isCreated())
                .andReturn();
        long stepId = objectMapper.readTree(logRes.getResponse().getContentAsString())
                .get("id").asLong();

        mockMvc.perform(delete("/api/steps/" + stepId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/steps")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(post("/api/undo")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entityType").value("step_log"));

        mockMvc.perform(get("/api/steps")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].logDate").value("2026-05-12"))
                .andExpect(jsonPath("$[0].steps").value(8500));
    }

    @Test
    void undo_restoresDeletedWeightLog() throws Exception {
        MvcResult res = mockMvc.perform(post("/api/weight")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"logDate": "2026-05-13", "weightLbs": 175.5}
                        """))
                .andExpect(status().isCreated())
                .andReturn();
        long weightId = objectMapper.readTree(res.getResponse().getContentAsString())
                .get("id").asLong();

        mockMvc.perform(delete("/api/weight/" + weightId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/weight")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(post("/api/undo")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entityType").value("weight_log"));

        mockMvc.perform(get("/api/weight")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].weightLbs").value(175.5));
    }

    @Test
    void undo_popsMostRecentAction_only() throws Exception {
        // Log + delete weight
        MvcResult w = mockMvc.perform(post("/api/weight")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"logDate": "2026-05-13", "weightLbs": 175.5}
                        """))
                .andExpect(status().isCreated())
                .andReturn();
        long weightId = objectMapper.readTree(w.getResponse().getContentAsString()).get("id").asLong();
        mockMvc.perform(delete("/api/weight/" + weightId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // Log + delete steps
        MvcResult s = mockMvc.perform(post("/api/steps")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"logDate": "2026-05-13", "steps": 8500}
                        """))
                .andExpect(status().isCreated())
                .andReturn();
        long stepId = objectMapper.readTree(s.getResponse().getContentAsString()).get("id").asLong();
        mockMvc.perform(delete("/api/steps/" + stepId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // First undo → restores steps (most recent)
        mockMvc.perform(post("/api/undo")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entityType").value("step_log"));
        mockMvc.perform(get("/api/steps")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(1));
        mockMvc.perform(get("/api/weight")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(0));

        // Second undo → restores weight
        mockMvc.perform(post("/api/undo")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entityType").value("weight_log"));
        mockMvc.perform(get("/api/weight")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void undo_whenNothingToUndo_returns404() throws Exception {
        mockMvc.perform(post("/api/undo")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void undo_cannotUndoOtherUsersDeletion() throws Exception {
        // User A logs and deletes a weight
        MvcResult w = mockMvc.perform(post("/api/weight")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"logDate": "2026-05-13", "weightLbs": 175.5}
                        """))
                .andExpect(status().isCreated())
                .andReturn();
        long weightId = objectMapper.readTree(w.getResponse().getContentAsString()).get("id").asLong();
        mockMvc.perform(delete("/api/weight/" + weightId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // User B has nothing to undo
        String tokenB = registerAndGetToken("undoother_" + 1, "pass5678");
        mockMvc.perform(post("/api/undo")
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());

        // User A can still undo their own
        mockMvc.perform(post("/api/undo")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void recentActions_listsUndoableEntries_mostRecentFirst() throws Exception {
        // Two deletions
        MvcResult w = mockMvc.perform(post("/api/weight")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"logDate": "2026-05-13", "weightLbs": 175.5}
                        """))
                .andExpect(status().isCreated())
                .andReturn();
        long weightId = objectMapper.readTree(w.getResponse().getContentAsString()).get("id").asLong();
        mockMvc.perform(delete("/api/weight/" + weightId)
                        .header("Authorization", "Bearer " + token));

        MvcResult s = mockMvc.perform(post("/api/steps")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"logDate": "2026-05-13", "steps": 8500}
                        """))
                .andExpect(status().isCreated())
                .andReturn();
        long stepId = objectMapper.readTree(s.getResponse().getContentAsString()).get("id").asLong();
        mockMvc.perform(delete("/api/steps/" + stepId)
                        .header("Authorization", "Bearer " + token));

        mockMvc.perform(get("/api/undo/recent")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].entityType").value("step_log"))
                .andExpect(jsonPath("$[1].entityType").value("weight_log"));
    }
}
