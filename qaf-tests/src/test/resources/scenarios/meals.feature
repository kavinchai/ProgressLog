@smoke @nutrition @meals
Feature: Meal logging CRUD

  Background:
    Given user is logged in with email '${test.user.email}' and password '${test.user.password}'
    And user navigates to the Today page
    And user waits for page to load

  @add-meal
  Scenario: Add a new meal creates nutrition log and opens meal modal
    When user clicks Add Meal button
    Then meal modal is displayed
    When user enters meal name 'Lunch'
    And user enters calories '800'
    And user enters protein '50'
    And user saves the meal
    Then modal is closed
    And meal 'Lunch' is displayed on the page

  @add-meal-no-name
  Scenario: Add a meal without a name uses default numbering
    When user clicks Add Meal button
    Then meal modal is displayed
    When user enters calories '500'
    And user enters protein '30'
    And user saves the meal
    Then modal is closed

  @verify-totals
  Scenario: Nutrition totals update after adding meals
    Given meal 'Lunch' is displayed on the page
    When user clicks Add Meal button
    And user enters meal name 'Dinner'
    And user enters calories '700'
    And user enters protein '45'
    And user saves the meal
    Then meal 'Dinner' is displayed on the page
    And nutrition total shows '1500 kcal'
    And nutrition total shows '95g protein'
