package com.kavin.fitness.integration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.time.LocalDate;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Verifies the shared-calendar opt-in contract:
 *
 *   - GET /api/profile/privacy returns the new shareCalendar field alongside shareData.
 *   - PUT /api/profile/privacy persists shareCalendar independently of shareData.
 *   - GET /api/shared-calendar is public and only includes workouts from users
 *     who set shareCalendar=true.
 */
class SharedCalendarFlowIT extends IntegrationTestBase {

    private String aliceToken;
    private String bobToken;

    @BeforeEach
    void setUp() throws Exception {
        aliceToken = registerAndGetToken("calendar_alice", "pass1234");
        bobToken   = registerAndGetToken("calendar_bob",   "pass1234");
    }

    @Test
    void privacyEndpoint_includesShareCalendarFlag_andDefaultsFalse() throws Exception {
        mockMvc.perform(get("/api/profile/privacy")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shareData").value(false))
                .andExpect(jsonPath("$.shareCalendar").value(false));
    }

    @Test
    void privacyEndpoint_persistsShareCalendarIndependentlyOfShareData() throws Exception {
        // Toggle ONLY shareCalendar on
        mockMvc.perform(put("/api/profile/privacy")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {"shareData": false, "shareCalendar": true}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shareData").value(false))
                .andExpect(jsonPath("$.shareCalendar").value(true));

        // Read back
        mockMvc.perform(get("/api/profile/privacy")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(jsonPath("$.shareData").value(false))
                .andExpect(jsonPath("$.shareCalendar").value(true));
    }

    @Test
    void sharedCalendarEndpoint_isPublic_andOnlyShowsOptedInUsers() throws Exception {
        String today     = LocalDate.now().toString();
        String yesterday = LocalDate.now().minusDays(1).toString();

        // Alice opts into calendar sharing and logs a workout
        mockMvc.perform(put("/api/profile/privacy")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"shareData\": false, \"shareCalendar\": true}"))
                .andExpect(status().isOk());
        seedLiftingWorkout(aliceToken, today, "Bench Press", 185, 5);

        // Bob does NOT opt in, but logs a workout
        seedLiftingWorkout(bobToken, yesterday, "Squats", 225, 3);

        // Public endpoint — no auth header
        mockMvc.perform(get("/api/shared-calendar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entries[?(@.username == 'calendar_alice')]", hasSize(1)))
                .andExpect(jsonPath("$.entries[?(@.username == 'calendar_bob')]", hasSize(0)))
                .andExpect(jsonPath("$.entries[0].sessionDate").value(today))
                .andExpect(jsonPath("$.entries[0].sets", hasSize(1)))
                .andExpect(jsonPath("$.entries[0].sets[0].exerciseName").value("Bench Press"))
                .andExpect(jsonPath("$.entries[0].sets[0].reps").value(5))
                .andExpect(jsonPath("$.entries[0].sets[0].weightLbs").value(185.0));
    }

    @Test
    void sharedCalendarEndpoint_excludesUserAfterTheyOptOut() throws Exception {
        String today = LocalDate.now().toString();

        // Opt in, log, verify present
        mockMvc.perform(put("/api/profile/privacy")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"shareData\": false, \"shareCalendar\": true}"))
                .andExpect(status().isOk());
        seedLiftingWorkout(aliceToken, today, "Deadlift", 315, 1);

        mockMvc.perform(get("/api/shared-calendar"))
                .andExpect(jsonPath("$.entries[?(@.username == 'calendar_alice')]", hasSize(1)));

        // Opt back out
        mockMvc.perform(put("/api/profile/privacy")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"shareData\": false, \"shareCalendar\": false}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/shared-calendar"))
                .andExpect(jsonPath("$.entries[?(@.username == 'calendar_alice')]", hasSize(0)));
    }

    private void seedLiftingWorkout(String token, String date, String exercise,
                                    double weightLbs, int reps) throws Exception {
        String body = String.format("""
            {
              "sessionName": "Test",
              "sessionDate": "%s",
              "exercises": [{
                "exerciseName": "%s",
                "sets": [{"setNumber": 1, "reps": %d, "weightLbs": %s}]
              }]
            }
            """, date, exercise, reps, weightLbs);

        mockMvc.perform(post("/api/workouts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());
    }
}
