package com.kavin.fitness.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * User registration → login → access protected endpoint → reject without token.
 */
class AuthFlowIT extends IntegrationTestBase {

    @Test
    void fullAuthFlow() throws Exception {
        // 1. Register
        String token = registerAndGetToken("authuser", "securepass123");

        // 2. Authenticated request succeeds
        mockMvc.perform(get("/api/profile/goals")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.calorieTargetTraining").value(2600))
                .andExpect(jsonPath("$.calorieTargetRest").value(2000))
                .andExpect(jsonPath("$.proteinTarget").value(180));

        // 3. Same credentials can log in again
        String token2 = loginAndGetToken("authuser", "securepass123");

        mockMvc.perform(get("/api/profile/goals")
                        .header("Authorization", "Bearer " + token2))
                .andExpect(status().isOk());
    }

    @Test
    void unauthenticatedRequest_returns401() throws Exception {
        mockMvc.perform(get("/api/profile/goals"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void invalidToken_returns401() throws Exception {
        mockMvc.perform(get("/api/profile/goals")
                        .header("Authorization", "Bearer fake.token.here"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void wrongPassword_returns401() throws Exception {
        registerAndGetToken("wrongpwuser", "correctpass");

        String body = objectMapper.writeValueAsString(
                java.util.Map.of("username", "wrongpwuser", "password", "wrongpass"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid username or password."));
    }

    @Test
    void duplicateUsername_returns400() throws Exception {
        registerAndGetToken("dupeuser", "pass1234");

        String body = objectMapper.writeValueAsString(
                java.util.Map.of("username", "dupeuser", "password", "pass5678",
                        "email", "dupeuser2@test.com"));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Username already taken."));
    }
}
