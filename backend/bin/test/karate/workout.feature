Feature: Workout API

  Background:
    * url baseUrl
    * def login = callonce read('classpath:karate/login.feature')
    * header Authorization = 'Bearer ' + login.token

  Scenario: Unauthenticated request returns 403
    * header Authorization = null
    Given path '/workouts'
    When method GET
    Then status 403

  Scenario: Get workouts returns a list
    Given path '/workouts'
    When method GET
    Then status 200
    And match response == '#array'

  Scenario: Create a workout session
    Given path '/workouts'
    And request { sessionDate: '2026-03-10' }
    When method POST
    Then status 201
    And match response.id == '#number'
    And match response.sessionDate == '2026-03-10'

  Scenario: Missing session date returns 400
    Given path '/workouts'
    And request {}
    When method POST
    Then status 400
