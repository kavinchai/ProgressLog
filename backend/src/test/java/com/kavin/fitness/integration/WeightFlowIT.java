package com.kavin.fitness.integration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * A user logs weight entries, reads them back sorted by date,
 * deletes one, and verifies another user can't see or delete them.
 */
class WeightFlowIT extends IntegrationTestBase {

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = registerAndGetToken("weightuser_" + 1, "pass1234");
    }

    @Test
    void logWeight_readBack_delete() throws Exception {
        // 1. Log two weight entries
        mockMvc.perform(post("/api/weight")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"logDate": "2026-04-01", "weightLbs": 150.5}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.weightLbs").value(150.5));

        MvcResult secondResult = mockMvc.perform(post("/api/weight")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"logDate": "2026-04-02", "weightLbs": 149.8}
                        """))
                .andExpect(status().isCreated())
                .andReturn();

        long secondId = objectMapper.readTree(secondResult.getResponse().getContentAsString())
                .get("id").asLong();

        // 2. Read all — should be sorted by date ascending
        mockMvc.perform(get("/api/weight")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].logDate").value("2026-04-01"))
                .andExpect(jsonPath("$[1].logDate").value("2026-04-02"));

        // 3. Delete the second entry
        mockMvc.perform(delete("/api/weight/" + secondId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // 4. Only one remains
        mockMvc.perform(get("/api/weight")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].logDate").value("2026-04-01"));
    }

    @Test
    void otherUser_cannotDeleteWeight() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/weight")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"logDate": "2026-04-10", "weightLbs": 151.0}
                        """))
                .andExpect(status().isCreated())
                .andReturn();

        long weightId = objectMapper.readTree(result.getResponse().getContentAsString())
                .get("id").asLong();

        String tokenB = registerAndGetToken("weightother_" + 1, "pass5678");

        // User B sees empty weight log
        mockMvc.perform(get("/api/weight")
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(jsonPath("$.length()").value(0));

        // User B cannot delete User A's weight entry
        mockMvc.perform(delete("/api/weight/" + weightId)
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());
    }
}
