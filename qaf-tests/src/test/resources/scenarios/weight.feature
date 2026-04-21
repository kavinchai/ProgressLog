@smoke @weight
Feature: Weight logging CRUD

  Background:
    Given user is logged in with email '${test.user.email}' and password '${test.user.password}'
    And user navigates to the Today page
    And user waits for page to load

  @add-weight
  Scenario: Add a new weight entry
    When user clicks Add Weight button
    Then weight modal is displayed with title 'Log Weight'
    When user enters weight value '185'
    And user saves the weight
    Then modal is closed
    And weight displays '185 lbs' on the page

  @edit-weight
  Scenario: Edit an existing weight entry
    Given weight displays '185 lbs' on the page
    When user clicks Edit Weight button
    Then weight modal is displayed with title 'Edit Weight'
    And weight input has value '185'
    When user enters weight value '186.5'
    And user saves the weight
    Then modal is closed
    And weight displays '186.5 lbs' on the page
