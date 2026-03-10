@ignore
Feature: Login helper

  Scenario:
    * url baseUrl
    * path '/auth/login'
    * request { username: 'testuser', password: 'password' }
    * method POST
    * def token = response.token
