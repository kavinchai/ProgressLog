package com.kavin.fitness.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import jakarta.servlet.http.Cookie;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/** "Keep me signed in" decides how long the sign-in cookie lasts. */
class KeepSignedInFlowIT extends IntegrationTestBase {

    private static final int ONE_DAY = 24 * 60 * 60;
    private static final int THIRTY_DAYS = 30 * ONE_DAY;

    @Test
    void loginWithKeepSignedIn_lastsThirtyDays() throws Exception {
        registerAndGetToken("keepuser", "securepass123");

        Cookie cookie =
                login(
                        Map.of(
                                "username",
                                "keepuser",
                                "password",
                                "securepass123",
                                "rememberMe",
                                true));

        assertEquals(THIRTY_DAYS, cookie.getMaxAge());
        mockMvc.perform(
                        get("/api/profile/goals")
                                .header("Authorization", "Bearer " + cookie.getValue()))
                .andExpect(status().isOk());
    }

    @Test
    void loginWithoutKeepSignedIn_lastsOneDay() throws Exception {
        registerAndGetToken("dayuser", "securepass123");

        Cookie cookie =
                login(
                        Map.of(
                                "username",
                                "dayuser",
                                "password",
                                "securepass123",
                                "rememberMe",
                                false));

        assertEquals(ONE_DAY, cookie.getMaxAge());
    }

    @Test
    void loginWithoutTheField_lastsOneDay() throws Exception {
        registerAndGetToken("oldclient", "securepass123");

        Cookie cookie = login(Map.of("username", "oldclient", "password", "securepass123"));

        assertEquals(ONE_DAY, cookie.getMaxAge());
    }

    @Test
    void registerWithKeepSignedIn_lastsThirtyDays() throws Exception {
        String body =
                objectMapper.writeValueAsString(
                        Map.of(
                                "username", "newkeeper",
                                "password", "securepass123",
                                "email", "newkeeper@test.com",
                                "rememberMe", true));

        MvcResult result =
                mockMvc.perform(
                                post("/api/auth/register")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(body))
                        .andExpect(status().isCreated())
                        .andReturn();

        assertEquals(THIRTY_DAYS, result.getResponse().getCookie("jwt").getMaxAge());
    }

    @Test
    void changingPasswordAfterKeepSignedIn_keepsTheThirtyDays() throws Exception {
        registerAndGetToken("keepchanger", "securepass123");
        Cookie cookie =
                login(
                        Map.of(
                                "username",
                                "keepchanger",
                                "password",
                                "securepass123",
                                "rememberMe",
                                true));

        Cookie reissued = changePassword(cookie);

        assertTrue(reissued.getMaxAge() > THIRTY_DAYS - 60, "got " + reissued.getMaxAge());
        assertTrue(reissued.getMaxAge() <= THIRTY_DAYS);
        mockMvc.perform(get("/api/profile/goals").cookie(reissued)).andExpect(status().isOk());
    }

    @Test
    void changingPasswordWithAnApiKey_givesOneDay() throws Exception {
        String token = registerAndGetToken("keyuser", "securepass123");
        String apiKey =
                objectMapper
                        .readTree(
                                mockMvc.perform(
                                                post("/api/auth/api-key")
                                                        .header("Authorization", "Bearer " + token))
                                        .andExpect(status().isOk())
                                        .andReturn()
                                        .getResponse()
                                        .getContentAsString())
                        .get("apiKey")
                        .asText();

        MvcResult result =
                mockMvc.perform(
                                put("/api/profile/credentials")
                                        .header("X-API-Key", apiKey)
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                objectMapper.writeValueAsString(
                                                        Map.of(
                                                                "currentPassword", "securepass123",
                                                                "newPassword", "newpass4567"))))
                        .andExpect(status().isOk())
                        .andReturn();

        assertEquals(ONE_DAY, result.getResponse().getCookie("jwt").getMaxAge());
    }

    @Test
    void changingPasswordAfterADaySignIn_staysADay() throws Exception {
        registerAndGetToken("daychanger", "securepass123");
        Cookie cookie =
                login(
                        Map.of(
                                "username",
                                "daychanger",
                                "password",
                                "securepass123",
                                "rememberMe",
                                false));

        Cookie reissued = changePassword(cookie);

        assertTrue(reissued.getMaxAge() > ONE_DAY - 60, "got " + reissued.getMaxAge());
        assertTrue(reissued.getMaxAge() <= ONE_DAY);
    }

    private Cookie changePassword(Cookie signIn) throws Exception {
        MvcResult result =
                mockMvc.perform(
                                put("/api/profile/credentials")
                                        .cookie(signIn)
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                objectMapper.writeValueAsString(
                                                        Map.of(
                                                                "currentPassword", "securepass123",
                                                                "newPassword", "newpass4567"))))
                        .andExpect(status().isOk())
                        .andReturn();
        return result.getResponse().getCookie("jwt");
    }

    private Cookie login(Map<String, Object> request) throws Exception {
        MvcResult result =
                mockMvc.perform(
                                post("/api/auth/login")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(request)))
                        .andExpect(status().isOk())
                        .andReturn();
        return result.getResponse().getCookie("jwt");
    }
}
