package com.kavin.fitness.controller;

import com.kavin.fitness.dto.SharedCalendarDTO;
import com.kavin.fitness.service.SharedCalendarService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/shared-calendar")
public class SharedCalendarController {

    @Autowired private SharedCalendarService sharedCalendarService;

    /** Public endpoint — only includes workouts from users who opted into calendar sharing. */
    @GetMapping
    public ResponseEntity<SharedCalendarDTO> getCalendar() {
        return ResponseEntity.ok(sharedCalendarService.getCalendar());
    }
}
