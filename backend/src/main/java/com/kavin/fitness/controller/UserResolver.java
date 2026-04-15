package com.kavin.fitness.controller;

import com.kavin.fitness.model.User;
import com.kavin.fitness.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

@Component
public class UserResolver {

    @Autowired
    private UserRepository userRepository;

    public User resolve(UserDetails principal) {
        return userRepository.findByUsername(principal.getUsername())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
    }
}
