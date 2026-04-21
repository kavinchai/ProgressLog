@smoke @workout @timed
Feature: Add and edit timed activities via Workout Builder

  Background:
    Given user is logged in with email '${test.user.email}' and password '${test.user.password}'
    And user navigates to the Today page
    And user waits for page to load

  @add-timed
  Scenario: Add a timed activity with hours, minutes, and seconds
    When user clicks Add Workout button
    Then workout builder modal is displayed
    When user clicks Add Timed button
    Then element with text 'Hr' is visible
    And element with text 'Min' is visible
    And element with text 'Sec' is visible
    When user enters exercise name 'Plank' at index '0'
    And user enters duration hours '0' minutes '2' seconds '30' at index '0'
    And user saves the workout
    Then modal is closed
    And exercise 'Plank' is displayed on the page
    And exercise 'Plank' shows duration '2m 30s'
    And exercise 'Plank' does not show weight

  @edit-timed-duration
  Scenario: Edit an existing timed activity duration
    Given exercise 'Plank' is displayed on the page
    When user clicks Edit on exercise at index '0'
    Then edit exercise modal shows title containing 'Plank'
    And element with text 'Hr' is visible
    When user edits minutes to '3' at set index '0'
    And user saves the exercise edit
    Then modal is closed
    And exercise 'Plank' shows duration '3m 30s'

  @display-timed-no-distance
  Scenario: Timed activity displays duration only without distance or pace
    Given exercise 'Plank' is displayed on the page
    Then element with text 'Distance' is not visible
    And element with text 'Pace' is not visible
    And element with text '0 lbs' is not visible
