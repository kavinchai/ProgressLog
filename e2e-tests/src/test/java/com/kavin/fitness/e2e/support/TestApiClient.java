package com.kavin.fitness.e2e.support;

import org.testng.Reporter;

import java.net.CookieHandler;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Lightweight HTTP client that logs in to the backend and exposes helpers to
 * seed workouts, weight, steps, and meals. Holds the JWT cookie automatically
 * via a CookieManager so subsequent calls are authenticated.
 *
 * Used by E2E tests that need known data on the server before driving the UI
 * (e.g. History/Progress/Leaderboard pages which would otherwise be empty for
 * a freshly created test user).
 */
public class TestApiClient {
    private final String apiUrl;
    private final HttpClient http;

    public TestApiClient(String apiUrl) {
        this.apiUrl = apiUrl;
        CookieManager cookieManager = new CookieManager();
        cookieManager.setCookiePolicy(CookiePolicy.ACCEPT_ALL);
        CookieHandler.setDefault(cookieManager);
        this.http = HttpClient.newBuilder().cookieHandler(cookieManager).build();
    }

    /** Login. Returns true on 2xx. Cookie is stored in the underlying CookieManager. */
    public boolean login(String username, String password) {
        String body = "{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}";
        HttpResponse<String> resp = post("/auth/login", body);
        return resp.statusCode() >= 200 && resp.statusCode() < 300;
    }

    /**
     * POST a workout session with one lifting exercise.
     * @param sessionDate ISO date string e.g. "2026-04-15"
     */
    public void logLiftingWorkout(String sessionDate, String sessionName, String exerciseName,
                                  double weightLbs, int reps) {
        String body = "{"
                + "\"sessionName\":\"" + sessionName + "\","
                + "\"sessionDate\":\"" + sessionDate + "\","
                + "\"exercises\":[{"
                + "\"exerciseName\":\"" + exerciseName + "\","
                + "\"sets\":[{\"setNumber\":1,\"reps\":" + reps + ",\"weightLbs\":" + weightLbs + "}]"
                + "}]}";
        HttpResponse<String> r = post("/workouts", body);
        if (r.statusCode() >= 300) {
            Reporter.log("WARN: seed workout HTTP " + r.statusCode() + " body=" + r.body(), true);
        }
    }

    /** POST a workout session with a single run exercise (distance in miles, duration in seconds). */
    public void logRunWorkout(String sessionDate, double distanceMiles, int durationSeconds) {
        String body = "{"
                + "\"sessionName\":\"Cardio\","
                + "\"sessionDate\":\"" + sessionDate + "\","
                + "\"exercises\":[{"
                + "\"exerciseName\":\"Run\","
                + "\"sets\":[{\"setNumber\":1,\"reps\":0,\"weightLbs\":0,"
                + "\"distanceMiles\":" + distanceMiles + ",\"durationSeconds\":" + durationSeconds + "}]"
                + "}]}";
        HttpResponse<String> r = post("/workouts", body);
        if (r.statusCode() >= 300) {
            Reporter.log("WARN: seed run HTTP " + r.statusCode() + " body=" + r.body(), true);
        }
    }

    public void logWeight(String date, double weightLbs) {
        String body = "{\"logDate\":\"" + date + "\",\"weightLbs\":" + weightLbs + "}";
        HttpResponse<String> r = post("/weight", body);
        if (r.statusCode() >= 300) {
            Reporter.log("WARN: seed weight HTTP " + r.statusCode() + " body=" + r.body(), true);
        }
    }

    public void logSteps(String date, int steps) {
        String body = "{\"logDate\":\"" + date + "\",\"steps\":" + steps + "}";
        HttpResponse<String> r = post("/steps", body);
        if (r.statusCode() >= 300) {
            Reporter.log("WARN: seed steps HTTP " + r.statusCode() + " body=" + r.body(), true);
        }
    }

    /** Delete all workout sessions for a given date (idempotent — silent if none). */
    public void deleteWorkoutsOnDate(String date) {
        HttpResponse<String> list = get("/workouts?date=" + date);
        if (list.statusCode() >= 300) return;
        String body = list.body();
        // Body is a JSON array of sessions; extract numeric "id" fields via a quick regex.
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\"id\"\\s*:\\s*(\\d+)").matcher(body);
        while (m.find()) {
            delete("/workouts/" + m.group(1));
        }
    }

    public HttpResponse<String> get(String path) {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl + path))
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
                    .DELETE().build();
            return http.send(req, HttpResponse.BodyHandlers.ofString());
        } catch (Exception e) {
            throw new RuntimeException("DELETE " + path + " failed: " + e.getMessage(), e);
        }
    }
}
