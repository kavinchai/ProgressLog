@smoke @workout @lifting
Feature: Add and edit lifting exercises via Workout Builder

  Background:
    Given user is logged in with email '${test.user.email}' and password '${test.user.password}'
    And user navigates to the Today page
    And user waits for page to load

  @add-single-exercise
  Scenario: Add a single lifting exercise with one set
    When user clicks Add Workout button
    Then workout builder modal is displayed
    When user enters session name 'Push Day'
    And user clicks Add Exercise button
    And user enters exercise name 'Bench Press' at index '0'
    And user enters weight '135' at index '0'
    And user enters reps '8' at index '0'
    And user saves the workout
    Then modal is closed
    And exercise 'Bench Press' is displayed on the page
    And exercise 'Bench Press' shows weight '135 lbs'
    And exercise 'Bench Press' shows reps '8'

  @add-multiple-sets
  Scenario: Add a lifting exercise with multiple sets
    When user clicks Add Workout button
    And user clicks Add Exercise button
    And user enters exercise name 'Squat' at index '0'
    And user enters weight '225' at index '0'
    And user enters reps '5' at index '0'
    And user clicks Add Set for exercise at index '0'
    And user enters weight '245' at index '1'
    And user enters reps '3' at index '1'
    And user saves the workout
    Then modal is closed
    And exercise 'Squat' is displayed on the page
    And exercise 'Squat' shows weight '225 lbs'

  @add-multiple-exercises
  Scenario: Add two different exercises in one session
    When user clicks Add Workout button
    And user enters session name 'Upper Body'
    And user clicks Add Exercise button
    And user enters exercise name 'Bench Press' at index '0'
    And user enters weight '135' at index '0'
    And user enters reps '8' at index '0'
    And user clicks Add Exercise button
    And user enters exercise name 'OHP' at index '1'
    And user enters weight '95' at index '1'
    And user enters reps '10' at index '1'
    And user saves the workout
    Then modal is closed
    And exercise 'Bench Press' is displayed on the page
    And exercise 'OHP' is displayed on the page

  @edit-exercise-weight
  Scenario: Edit an existing lifting exercise weight
    # Prerequisite: a workout with Bench Press 135lbs exists
    Given exercise 'Bench Press' is displayed on the page
    When user clicks Edit on exercise at index '0'
    Then edit exercise modal shows title containing 'Bench Press'
    When user edits weight to '145' at set index '0'
    And user saves the exercise edit
    Then modal is closed
    And exercise 'Bench Press' shows weight '145 lbs'

  @delete-exercise
  Scenario: Delete an existing exercise
    Given exercise 'Bench Press' is displayed on the page
    When user clicks Edit on exercise at index '0'
    Then edit exercise modal shows title containing 'Bench Press'
    When user deletes the exercise
    Then modal is closed
    And element with text 'Bench Press' is not visible

  @toggle-to-timed
  Scenario: Toggle a lifting exercise to timed type
    When user clicks Add Workout button
    And user clicks Add Exercise button
    Then element with text 'Weight (lbs)' is visible
    When user toggles exercise type at index '0'
    Then element with text 'Hr' is visible
    And element with text 'Weight (lbs)' is not visible
