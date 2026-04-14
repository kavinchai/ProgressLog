package com.kavin.fitness.integration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * A user creates a nutrition day, adds meals, sees totals aggregate,
 * updates a meal, deletes a meal, and deletes the day.
 * A second user's data is isolated.
 */
class NutritionFlowIT extends IntegrationTestBase {

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = registerAndGetToken("nutritionuser_" + 1, "pass1234");
    }

    @Test
    void fullNutritionDayFlow() throws Exception {
        // 1. Create a nutrition day log
        String dayLog = """
            {"logDate": "2026-04-01", "dayType": "training", "steps": 10000}
            """;

        MvcResult dayResult = mockMvc.perform(post("/api/nutrition")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(dayLog))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.dayType").value("training"))
                .andExpect(jsonPath("$.steps").value(10000))
                .andExpect(jsonPath("$.totalCalories").value(0))
                .andExpect(jsonPath("$.totalProtein").value(0))
                .andReturn();

        long logId = objectMapper.readTree(dayResult.getResponse().getContentAsString())
                .get("id").asLong();

        // 2. Add a meal
        String meal1 = """
            {"mealName": "Breakfast", "calories": 600, "proteinGrams": 35}
            """;

        mockMvc.perform(post("/api/nutrition/" + logId + "/meals")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(meal1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCalories").value(600))
                .andExpect(jsonPath("$.totalProtein").value(35))
                .andExpect(jsonPath("$.meals.length()").value(1));

        // 3. Add a second meal — totals should aggregate
        String meal2 = """
            {"mealName": "Lunch", "calories": 800, "proteinGrams": 50}
            """;

        MvcResult mealResult = mockMvc.perform(post("/api/nutrition/" + logId + "/meals")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(meal2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCalories").value(1400))
                .andExpect(jsonPath("$.totalProtein").value(85))
                .andExpect(jsonPath("$.meals.length()").value(2))
                .andReturn();

        long mealId = objectMapper.readTree(mealResult.getResponse().getContentAsString())
                .path("meals").get(1).get("id").asLong();

        // 4. Update the second meal
        String updatedMeal = """
            {"mealName": "Big Lunch", "calories": 1000, "proteinGrams": 60}
            """;

        mockMvc.perform(put("/api/nutrition/" + logId + "/meals/" + mealId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updatedMeal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCalories").value(1600))
                .andExpect(jsonPath("$.totalProtein").value(95));

        // 5. Delete the second meal
        mockMvc.perform(delete("/api/nutrition/" + logId + "/meals/" + mealId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // 6. Verify only one meal remains
        mockMvc.perform(get("/api/nutrition")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].meals.length()").value(1))
                .andExpect(jsonPath("$[0].totalCalories").value(600));

        // 7. Delete the entire day log
        mockMvc.perform(delete("/api/nutrition/" + logId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/nutrition")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void upsertLog_updatesExistingDayInsteadOfCreatingDuplicate() throws Exception {
        // Create a day as "rest"
        mockMvc.perform(post("/api/nutrition")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"logDate": "2026-04-05", "dayType": "rest", "steps": 3000}
                        """))
                .andExpect(status().isCreated());

        // Upsert same day as "training" — should update, not create a second entry
        mockMvc.perform(post("/api/nutrition")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"logDate": "2026-04-05", "dayType": "training", "steps": 12000}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.dayType").value("training"))
                .andExpect(jsonPath("$.steps").value(12000));

        // Only one log for that date
        mockMvc.perform(get("/api/nutrition")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void otherUser_cannotAccessMeals() throws Exception {
        // User A creates a day + meal
        MvcResult dayResult = mockMvc.perform(post("/api/nutrition")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"logDate": "2026-04-03", "dayType": "training", "steps": 8000}
                        """))
                .andExpect(status().isCreated())
                .andReturn();

        long logId = objectMapper.readTree(dayResult.getResponse().getContentAsString())
                .get("id").asLong();

        // User B registers
        String tokenB = registerAndGetToken("nutritionother_" + 1, "pass5678");

        // User B cannot add a meal to User A's log
        mockMvc.perform(post("/api/nutrition/" + logId + "/meals")
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"mealName": "Hack", "calories": 1, "proteinGrams": 1}
                        """))
                .andExpect(status().isNotFound());

        // User B cannot delete User A's log
        mockMvc.perform(delete("/api/nutrition/" + logId)
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());
    }
}
