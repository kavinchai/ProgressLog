package com.kavin.fitness.e2e.support;

import org.testng.Reporter;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Lightweight HTTP client that logs in to the backend and exposes helpers to
 * seed workouts, weight, steps, and meals. Holds the JWT cookie via a
 * CookieManager scoped to this HttpClient instance — no JVM-wide side effects.
 *
 * Fail-fast: login() and each seed method throw on non-2xx responses so test
 * setup fails with an actionable error instead of leaving the UI empty and
 * producing a confusing "sidebar not visible" assertion failure downstream.
 */
public class TestApiClient {
    private final String apiUrl;
    private final HttpClient http;

    public TestApiClient(String apiUrl) {
        this.apiUrl = apiUrl;
        CookieManager cookieManager = new CookieManager();
        cookieManager.setCookiePolicy(CookiePolicy.ACCEPT_ALL);
        this.http = HttpClient.newBuilder().cookieHandler(cookieManager).build();
    }

    /** Login. Throws if the response is not 2xx so test setup fails loudly. */
    public void login(String username, String password) {
        String body = "{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}";
        HttpResponse<String> resp = post("/auth/login", body);
        if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
            throw new IllegalStateException("TestApiClient login failed: HTTP "
                    + resp.statusCode() + " body=" + resp.body()
                    + " (apiUrl=" + apiUrl + ", username=" + username + ")");
        }
    }

    public void logLiftingWorkout(String sessionDate, String sessionName, String exerciseName,
                                  double weightLbs, int reps) {
        String body = "{"
                + "\"sessionName\":\"" + sessionName + "\","
                + "\"sessionDate\":\"" + sessionDate + "\","
                + "\"exercises\":[{"
                + "\"exerciseName\":\"" + exerciseName + "\","
                + "\"sets\":[{\"setNumber\":1,\"reps\":" + reps + ",\"weightLbs\":" + weightLbs + "}]"
                + "}]}";
        assertOk(post("/workouts", body), "seed lifting workout " + exerciseName + " on " + sessionDate);
    }

    public void logRunWorkout(String sessionDate, double distanceMiles, int durationSeconds) {
        String body = "{"
                + "\"sessionName\":\"Cardio\","
                + "\"sessionDate\":\"" + sessionDate + "\","
                + "\"exercises\":[{"
                + "\"exerciseName\":\"Run\","
                + "\"sets\":[{\"setNumber\":1,\"reps\":0,\"weightLbs\":0,"
                + "\"distanceMiles\":" + distanceMiles + ",\"durationSeconds\":" + durationSeconds + "}]"
                + "}]}";
        assertOk(post("/workouts", body), "seed run on " + sessionDate);
    }

    public void logWeight(String date, double weightLbs) {
        String body = "{\"logDate\":\"" + date + "\",\"weightLbs\":" + weightLbs + "}";
        assertOk(post("/weight", body), "seed weight on " + date);
    }

    public void logSteps(String date, int steps) {
        String body = "{\"logDate\":\"" + date + "\",\"steps\":" + steps + "}";
        assertOk(post("/steps", body), "seed steps on " + date);
    }

    /** Delete all workout sessions for a given date. No-op if none exist. */
    public void deleteWorkoutsOnDate(String date) {
        HttpResponse<String> list = get("/workouts?date=" + date);
        if (list.statusCode() >= 300) {
            Reporter.log("WARN: list workouts " + date + " -> HTTP " + list.statusCode(), true);
            return;
        }
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\"id\"\\s*:\\s*(\\d+)").matcher(list.body());
        while (m.find()) {
            HttpResponse<String> r = delete("/workouts/" + m.group(1));
            if (r.statusCode() >= 300) {
                Reporter.log("WARN: delete workout " + m.group(1) + " -> HTTP " + r.statusCode(), true);
            }
        }
    }

    /** Returns the number of workout sessions on a given date — used to verify seeding. */
    public int countWorkoutsOnDate(String date) {
        HttpResponse<String> list = get("/workouts?date=" + date);
        if (list.statusCode() >= 300) return -1;
        int count = 0;
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\"id\"\\s*:\\s*\\d+").matcher(list.body());
        while (m.find()) count++;
        return count;
    }

    private static void assertOk(HttpResponse<String> resp, String label) {
        if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
            throw new IllegalStateException(
                    "TestApiClient " + label + " failed: HTTP " + resp.statusCode()
                            + " body=" + resp.body());
        }
    }

    public HttpResponse<String> get(String path) {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl + path))
                    .timeout(Duration.ofSeconds(10))
                    .GET().build();
            return http.send(req, HttpResponse.BodyHandlers.ofString());
        } catch (Exception e) {
            throw new RuntimeException("GET " + path + " failed: " + e.getMessage(), e);
        }
    }

    public HttpResponse<String> post(String path, String json) {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl + path))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(10))
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            return http.send(req, HttpResponse.BodyHandlers.ofString());
        } catch (Exception e) {
            throw new RuntimeException("POST " + path + " failed: " + e.getMessage(), e);
        }
    }

    public HttpResponse<String> delete(String path) {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl + path))
                    .timeout(Duration.ofSeconds(10))
                    .DELETE().build();
            return http.send(req, HttpResponse.BodyHandlers.ofString());
        } catch (Exception e) {
            throw new RuntimeException("DELETE " + path + " failed: " + e.getMessage(), e);
        }
    }
}
