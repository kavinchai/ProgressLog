package com.kavin.fitness.dto;

import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MilestoneDTO {

    private Long id;
    private LocalDate eventDate;
    private String type; // "achievement" | "setback" | "milestone" | "note"
    private String title;
    private String description;
}
