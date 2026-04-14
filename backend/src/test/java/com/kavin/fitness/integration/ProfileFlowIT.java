package com.kavin.fitness.integration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * A user reads default goals, updates them, reads them back,
 * updates email, verifies password, and changes credentials.
 */
class ProfileFlowIT extends IntegrationTestBase {

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = registerAndGetToken("profileuser_" + 1, "oldpass123");
    }

    @Test
    void goalsFlow_readDefaults_update_readBack() throws Exception {
        // 1. Default goals
        mockMvc.perform(get("/api/profile/goals")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.calorieTargetTraining").value(2600))
                .andExpect(jsonPath("$.calorieTargetRest").value(2000))
                .andExpect(jsonPath("$.proteinTarget").value(180));

        // 2. Update goals
        mockMvc.perform(put("/api/profile/goals")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"calorieTargetTraining": 2800, "calorieTargetRest": 2200, "proteinTarget": 200}
                        """))
                .andExpect(status().isOk());

        // 3. Read back — should reflect new values
        mockMvc.perform(get("/api/profile/goals")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.calorieTargetTraining").value(2800))
                .andExpect(jsonPath("$.calorieTargetRest").value(2200))
                .andExpect(jsonPath("$.proteinTarget").value(200));
    }

    @Test
    void emailFlow_readRegistered_update_readBack() throws Exception {
        // 1. Email matches what was provided at registration
        mockMvc.perform(get("/api/profile/email")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("profileuser_1@test.com"));

        // 2. Update email
        mockMvc.perform(put("/api/profile/email")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"email": "updated@example.com"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("updated@example.com"));

        // 3. Read back — should reflect the update
        mockMvc.perform(get("/api/profile/email")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.email").value("updated@example.com"));
    }

    @Test
    void invalidEmail_returns400() throws Exception {
        mockMvc.perform(put("/api/profile/email")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"email": "not-an-email"}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid email address."));
    }

    @Test
    void passwordVerification() throws Exception {
        // Correct password
        mockMvc.perform(post("/api/profile/verify-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"password": "oldpass123"}
                        """))
                .andExpect(status().isOk());

        // Wrong password
        mockMvc.perform(post("/api/profile/verify-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"password": "wrongpass"}
                        """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void changePassword_oldPasswordStopsWorking_newPasswordWorks() throws Exception {
        // Change password
        MvcResult credResult = mockMvc.perform(put("/api/profile/credentials")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"currentPassword": "oldpass123", "newPassword": "newpass456"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.username").exists())
                .andReturn();

        String newToken = objectMapper.readTree(credResult.getResponse().getContentAsString())
                .get("token").asText();
        String username = objectMapper.readTree(credResult.getResponse().getContentAsString())
                .get("username").asText();

        // Old password no longer works for login
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                java.util.Map.of("username", username, "password", "oldpass123"))))
                .andExpect(status().isUnauthorized());

        // New password works for login
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                java.util.Map.of("username", username, "password", "newpass456"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists());

        // New token from credential change is valid
        mockMvc.perform(get("/api/profile/goals")
                        .header("Authorization", "Bearer " + newToken))
                .andExpect(status().isOk());
    }
}
