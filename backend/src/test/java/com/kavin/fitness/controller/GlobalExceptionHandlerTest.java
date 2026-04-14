package com.kavin.fitness.controller;

import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleNotFound_returns404WithMessage() {
        ResponseEntity<Map<String, String>> response =
                handler.handleNotFound(new EntityNotFoundException("Session not found"));

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("Session not found", response.getBody().get("message"));
    }

    @Test
    void handleBadRequest_returns400WithMessage() {
        ResponseEntity<Map<String, String>> response =
                handler.handleBadRequest(new IllegalArgumentException("Username already taken."));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Username already taken.", response.getBody().get("message"));
    }

    @Test
    void handleIllegalState_returns500WithMessage() {
        ResponseEntity<Map<String, String>> response =
                handler.handleIllegalState(new IllegalStateException("Authenticated user not found"));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertEquals("Authenticated user not found", response.getBody().get("message"));
    }

    @Test
    void handleBadCredentials_returns401WithGenericMessage() {
        ResponseEntity<Map<String, String>> response =
                handler.handleBadCredentials(new BadCredentialsException("Bad creds"));

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals("Invalid username or password.", response.getBody().get("message"));
    }

    @Test
    void handleGeneral_returns500WithGenericMessage() {
        ResponseEntity<Map<String, String>> response =
                handler.handleGeneral(new RuntimeException("something broke"));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertEquals("An unexpected error occurred.", response.getBody().get("message"));
    }
}
