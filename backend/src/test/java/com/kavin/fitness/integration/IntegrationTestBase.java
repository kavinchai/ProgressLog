package com.kavin.fitness.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Base class for integration tests.
 * Uses the local PostgreSQL (docker-compose) with a dedicated fitness_test database.
 * Flyway runs migrations on startup. Each test class gets a clean slate via truncation.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class IntegrationTestBase {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanDatabase() {
        // Truncate all user data between tests; cascades handle child tables
        jdbcTemplate.execute("TRUNCATE TABLE users CASCADE");
    }

    /**
     * Register a user and return the JWT token from the Set-Cookie header.
     */
    protected String registerAndGetToken(String username, String password) throws Exception {
        String body = objectMapper.writeValueAsString(
                java.util.Map.of("username", username, "password", password,
                        "email", username + "@test.com"));

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();

        return extractJwtFromCookie(result);
    }

    /**
     * Login and return the JWT token from the Set-Cookie header.
     */
    protected String loginAndGetToken(String username, String password) throws Exception {
        String body = objectMapper.writeValueAsString(
                java.util.Map.of("username", username, "password", password));

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();

        return extractJwtFromCookie(result);
    }

    /**
     * Extract the JWT value from the "jwt" cookie in the response.
     */
    protected String extractJwtFromCookie(MvcResult result) {
        Cookie cookie = result.getResponse().getCookie("jwt");
        if (cookie != null) {
            return cookie.getValue();
        }
        throw new AssertionError("Expected 'jwt' cookie in response but none was found");
    }
}
