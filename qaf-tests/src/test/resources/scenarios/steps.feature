@smoke @steps
Feature: Steps tracking CRUD

  Background:
    Given user is logged in with email '${test.user.email}' and password '${test.user.password}'
    And user navigates to the Today page
    And user waits for page to load

  @add-steps
  Scenario: Add steps for the day
    When user clicks Add Steps button
    And user enters steps value '10000'
    And user saves the steps
    Then steps displays '10,000' on the page

  @edit-steps
  Scenario: Edit existing steps count
    Given steps displays '10,000' on the page
    When user clicks Add Steps button
    And user enters steps value '12345'
    And user saves the steps
    Then steps displays '12,345' on the page

  @delete-steps
  Scenario: Delete steps entry
    Given steps displays '12,345' on the page
    When user deletes the steps
    Then steps displays '--' on the page
