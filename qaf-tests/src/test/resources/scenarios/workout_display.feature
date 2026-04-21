@smoke @workout @display
Feature: Workout display renders exercise types correctly

  Background:
    Given user is logged in with email '${test.user.email}' and password '${test.user.password}'
    And user navigates to the Today page
    And user waits for page to load

  @display-lifting
  Scenario: Lifting exercise displays weight and reps
    Given exercise 'Bench Press' is displayed on the page
    Then exercise 'Bench Press' shows weight '135 lbs'
    And exercise 'Bench Press' shows reps '8'

  @display-run
  Scenario: Run exercise displays distance, time, and pace without weight
    Given exercise 'Run' is displayed on the page
    Then exercise 'Run' shows distance '3.1 mi'
    And exercise 'Run' shows duration '25m 30s'
    And exercise 'Run' does not show weight

  @display-timed
  Scenario: Timed activity displays duration only
    Given exercise 'Plank' is displayed on the page
    Then exercise 'Plank' shows duration '2m 0s'
    And exercise 'Plank' does not show weight
    And element with text 'Distance' is not visible
    And element with text 'Pace' is not visible

  @display-mixed
  Scenario: Mixed workout shows both lifting and cardio exercises
    Given exercise 'Squat' is displayed on the page
    And exercise 'Run' is displayed on the page
    Then exercise 'Squat' shows weight '225 lbs'
    And exercise 'Run' shows distance '1 mi'

  @session-rename
  Scenario: Rename a workout session
    When user renames workout session to 'Morning Workout'
    Then workout session name shows 'Morning Workout'
