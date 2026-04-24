package com.kavin.fitness.controller;

import com.kavin.fitness.dto.ErrorResponse;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;

import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleNotFound_returns404WithMessage() {
        ResponseEntity<ErrorResponse> response =
                handler.handleNotFound(new EntityNotFoundException("Session not found"));

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("Session not found", response.getBody().getMessage());
    }

    @Test
    void handleBadRequest_returns400WithMessage() {
        ResponseEntity<ErrorResponse> response =
                handler.handleBadRequest(new IllegalArgumentException("Username already taken."));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Username already taken.", response.getBody().getMessage());
    }

    @Test
    void handleIllegalState_returns500WithMessage() {
        ResponseEntity<ErrorResponse> response =
                handler.handleIllegalState(new IllegalStateException("Authenticated user not found"));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertEquals("Authenticated user not found", response.getBody().getMessage());
    }

    @Test
    void handleBadCredentials_returns401WithGenericMessage() {
        ResponseEntity<ErrorResponse> response =
                handler.handleBadCredentials(new BadCredentialsException("Bad creds"));

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals("Invalid username or password.", response.getBody().getMessage());
    }

    @Test
    void handleGeneral_returns500WithGenericMessage() {
        ResponseEntity<ErrorResponse> response =
                handler.handleGeneral(new RuntimeException("something broke"));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertEquals("An unexpected error occurred.", response.getBody().getMessage());
    }
}
