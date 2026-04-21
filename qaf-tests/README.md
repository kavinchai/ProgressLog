# E2E Tests (QAF + Selenium)

End-to-end UI tests using [QAF (Quality Automation Framework)](https://qmetry.github.io/qaf/) with Selenium WebDriver.

## Prerequisites

- Java 21+
- Chrome browser installed
- Backend running (`docker-compose up` or local)
- Frontend dev server running (`cd frontend && npm run dev`)

## Configuration

Edit `src/main/resources/application.properties`:

- `env.baseurl` — frontend URL (default: `http://localhost:5173`)
- `driver.name` — browser driver (default: `chromeDriver`)

Edit `src/main/resources/env.properties`:

- `test.user.email` — test account email
- `test.user.password` — test account password

## Running Tests

```bash
cd qaf-tests

# Run all tests
./gradlew test

# Run specific feature tag
./gradlew test -Dgroups=lifting

# Run headed (non-headless) for debugging
./gradlew test -Ddriver.additional.capabilities='{"goog:chromeOptions":{"args":["--window-size=1920,1080"]}}'
```

## Project Structure

```
qaf-tests/
├── build.gradle.kts                    # Dependencies (QAF, Selenium, WebDriverManager)
├── src/main/java/.../
│   ├── config/DriverSetup.java         # WebDriverManager setup
│   ├── pages/                          # Page Object classes
│   │   ├── TodayPage.java
│   │   ├── WorkoutBuilderModal.java
│   │   ├── EditExerciseModal.java
│   │   ├── WeightModal.java
│   │   ├── MealModal.java
│   │   └── LoginPage.java
│   └── steps/                          # BDD step definitions
│       ├── CommonSteps.java
│       ├── WorkoutSteps.java
│       ├── WeightSteps.java
│       └── NutritionSteps.java
├── src/main/resources/
│   ├── application.properties          # QAF config
│   ├── env.properties                  # Test credentials
│   └── locators/                       # Element locator repository
│       ├── today.loc
│       ├── modals.loc
│       └── login.loc
└── src/test/resources/
    ├── testng-config.xml               # Test suite config
    └── scenarios/                      # BDD feature files
        ├── workout_lifting.feature
        ├── workout_run.feature
        ├── workout_timed.feature
        ├── workout_display.feature
        ├── weight.feature
        ├── steps.feature
        └── meals.feature
```

## Writing New Tests

1. Add locators to the appropriate `.loc` file
2. Create/update page objects if new UI elements are involved
3. Add step definitions in the `steps/` package
4. Write scenarios in `.feature` files using BDD syntax

## Tags

- `@smoke` — core flows (all scenarios)
- `@workout` — workout-related tests
- `@lifting` / `@run` / `@timed` — exercise type subcategories
- `@weight` — weight logging tests
- `@steps` — step tracking tests
- `@nutrition` / `@meals` — nutrition and meal tests
- `@display` — display/rendering verification tests
