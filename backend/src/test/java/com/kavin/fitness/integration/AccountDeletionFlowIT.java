package com.kavin.fitness.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MvcResult;

/**
 * A user deletes their account with their password: the account and all its data are gone, the
 * session cookie is cleared, and the old credentials no longer log in. A wrong password deletes
 * nothing.
 */
class AccountDeletionFlowIT extends IntegrationTestBase {

    @Autowired private JdbcTemplate jdbc;

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = registerAndGetToken("deleteuser", "pass1234");
        mockMvc.perform(
                        post("/api/weight")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                            {"logDate": "2026-04-01", "weightLbs": 150.5}
                        """))
                .andExpect(status().isCreated());
        mockMvc.perform(
                        post("/api/workouts")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                            {
                                "sessionDate": "2026-04-01",
                                "sessionName": "Push Day",
                                "exercises": [
                                    {
                                        "exerciseName": "Bench Press",
                                        "sets": [{"setNumber": 1, "reps": 8, "weightLbs": 135}]
                                    }
                                ]
                            }
                        """))
                .andExpect(status().isCreated());
    }

    private void deleteAccount() throws Exception {
        mockMvc.perform(
                        post("/api/profile/delete-account")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"password\": \"pass1234\"}"))
                .andExpect(status().isNoContent());
    }

    private int count(String sql) {
        return jdbc.queryForObject(sql, Integer.class);
    }

    @Test
    void deleteAccount_removesUserAndData_andClearsCookie() throws Exception {
        MvcResult result =
                mockMvc.perform(
                                post("/api/profile/delete-account")
                                        .header("Authorization", "Bearer " + token)
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content("{\"password\": \"pass1234\"}"))
                        .andExpect(status().isNoContent())
                        .andReturn();

        assertThat(result.getResponse().getCookie("jwt")).isNotNull();
        assertThat(result.getResponse().getCookie("jwt").getMaxAge()).isZero();
        assertThat(count("SELECT COUNT(*) FROM users WHERE username = 'deleteuser'")).isZero();
        assertThat(count("SELECT COUNT(*) FROM weight_log")).isZero();
        assertThat(count("SELECT COUNT(*) FROM workout_session")).isZero();
        assertThat(count("SELECT COUNT(*) FROM exercise_set")).isZero();

        String login =
                objectMapper.writeValueAsString(
                        java.util.Map.of("username", "deleteuser", "password", "pass1234"));
        mockMvc.perform(
                        post("/api/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(login))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void oldTokenAfterDeletion_returns401() throws Exception {
        deleteAccount();

        // Another device or API caller may still hold the deleted user's unexpired token.
        mockMvc.perform(get("/api/weight").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void wrongPassword_returns400_andKeepsAccount() throws Exception {
        mockMvc.perform(
                        post("/api/profile/delete-account")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"password\": \"wrongpass\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Incorrect password."));

        assertThat(count("SELECT COUNT(*) FROM users WHERE username = 'deleteuser'")).isOne();
        assertThat(count("SELECT COUNT(*) FROM weight_log")).isOne();
    }

    @Test
    void unauthenticated_returns401() throws Exception {
        mockMvc.perform(
                        post("/api/profile/delete-account")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"password\": \"pass1234\"}"))
                .andExpect(status().isUnauthorized());
    }
}
