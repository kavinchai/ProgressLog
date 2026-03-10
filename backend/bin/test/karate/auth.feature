Feature: Auth API

  Background:
    * url baseUrl

  Scenario: Valid login returns a JWT token
    Given path '/auth/login'
    And request { username: 'testuser', password: 'password' }
    When method POST
    Then status 200
    And match response.token != null
    And match response.username == 'testuser'

  Scenario: Wrong password returns 403
    Given path '/auth/login'
    And request { username: 'testuser', password: 'wrong' }
    When method POST
    Then status 403

  Scenario: Blank username returns 400
    Given path '/auth/login'
    And request { username: '', password: 'password' }
    When method POST
    Then status 400
