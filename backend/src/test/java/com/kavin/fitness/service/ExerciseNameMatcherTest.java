package com.kavin.fitness.service;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class ExerciseNameMatcherTest {

    private static void same(String a, String b) {
        assertTrue(ExerciseNameMatcher.isSameLift(a, b), a + " should match " + b);
        assertTrue(ExerciseNameMatcher.isSameLift(b, a), b + " should match " + a);
    }

    private static void different(String a, String b) {
        assertFalse(ExerciseNameMatcher.isSameLift(a, b), a + " should not match " + b);
    }

    @Test
    void ignoresCaseSpacingPunctuationAndPlurals() {
        same("Lat Pull Down", "Lat Pulldowns");
        same("lat pulldown", "Lat Pulldowns");
        same("Squat", "Squats");
        same("Rear Delt Fly", "Rear Delt Flies");
        same("Pike Pushups", "Pike Push-ups");
        same("leg extension", "Leg Extensions");
    }

    @Test
    void matchesTheSameWordsInAnotherOrder() {
        same("Curl Bicep", "Bicep Curls");
    }

    @Test
    void allowsSmallTyposOnLongerNames() {
        same("Lat Puldowns", "Lat Pulldowns");
        same("Romanian Deadlfits", "Romanian Deadlifts");
        same("Tricep Pushdwon", "Tricep Pushdown");
    }

    @Test
    void usesTheAliasListForSynonyms() {
        same("Incline Barbell Press", "Incline Bench Press");
        same("Bicep Curl Dumbbell", "Bicep Curls");
        same("Cable Tricep Pull Down", "Tricep Pushdown");
        same("RDL", "Romanian Deadlifts");
    }

    @Test
    void keepsGenuinelyDifferentLiftsApart() {
        different("Incline Dumbbell Press", "Incline Bench Press");
        different("Pull Ups", "Push Ups");
        different("Leg Curls", "Leg Press");
        different("Hammer Curls", "Bicep Curls");
        different("Single Arm Cable Pulldown", "Lat Pulldowns");
        different("Front Raises", "Lateral Raises");
        different("Bench Press", "Dumbbell Bench Press");
    }

    @Test
    void aTypoNeverTurnsOneLiftIntoAnother() {
        different("Hack Squat", "Back Squat");
        different("Incline Bench Press", "Decline Bench Press");
        different("Incline Press", "Decline Press");
        different("Incline Barbell Press", "Decline Bench Press");
        different("Hip Abduction", "Hip Adduction");
        different("Abduction Machine", "Adduction Machine");
        different("Rope Pushdown", "Rope Pulldown");
        different("Straight Arm Pulldown", "Straight Arm Pushdown");
        different("Cable Bicep Curl", "Cable Tricep Curl");
    }

    @Test
    void shortNamesNeedAnExactSpellingMatch() {
        different("Row", "Rows Machine");
        different("Dips", "Dip Belt");
        same("Dip", "Dips");
    }

    @Test
    void containsAllWords_isTheLooserMaybeCheck() {
        assertTrue(ExerciseNameMatcher.containsAllWords("incline press", "Incline Bench Press"));
        assertTrue(ExerciseNameMatcher.containsAllWords("incline press", "Incline Dumbbell Press"));
        assertFalse(ExerciseNameMatcher.containsAllWords("press", "Incline Bench Press"));
        assertFalse(ExerciseNameMatcher.containsAllWords("lat pull", "Lat Pulldowns"));
    }
}
