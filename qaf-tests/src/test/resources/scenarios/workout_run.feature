@smoke @workout @run
Feature: Add and edit run exercises via Workout Builder

  Background:
    Given user is logged in with email '${test.user.email}' and password '${test.user.password}'
    And user navigates to the Today page
    And user waits for page to load

  @add-run
  Scenario: Add a run exercise with distance and time
    When user clicks Add Workout button
    Then workout builder modal is displayed
    When user clicks Add Run button
    Then element with text 'Distance (mi)' is visible
    And element with text 'Min' is visible
    And element with text 'Sec' is visible
    When user enters distance '3.1' at index '0'
    And user enters run time minutes '25' seconds '30' at index '0'
    And user saves the workout
    Then modal is closed
    And exercise 'Run' is displayed on the page
    And exercise 'Run' shows distance '3.1 mi'
    And exercise 'Run' shows duration '25m 30s'
    And exercise 'Run' does not show weight

  @rename-run
  Scenario: Change the default run exercise name
    When user clicks Add Workout button
    And user clicks Add Run button
    And user enters exercise name 'Morning Jog' at index '0'
    And user enters distance '2' at index '0'
    And user enters run time minutes '18' seconds '0' at index '0'
    And user saves the workout
    Then modal is closed
    And exercise 'Morning Jog' is displayed on the page

  @edit-run-distance
  Scenario: Edit an existing run exercise distance
    Given exercise 'Run' is displayed on the page
    When user clicks Edit on exercise at index '0'
    Then edit exercise modal shows title containing 'Run'
    And element with text 'Distance (mi)' is visible
    When user edits distance to '5' at set index '0'
    And user saves the exercise edit
    Then modal is closed
    And exercise 'Run' shows distance '5 mi'
