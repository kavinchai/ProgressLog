package com.kavin.fitness.controller;

import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UserResolver {

    private final UserRepository userRepository;

    public User resolve(UserDetails principal) {
        return userRepository
                .findByUsername(principal.getUsername())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
    }
}
