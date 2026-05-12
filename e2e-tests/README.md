# E2E Tests (Selenium + TestNG)

End-to-end UI tests using Selenium WebDriver with TestNG, organized via page objects.

## Prerequisites

- Java 21+
- Chrome browser installed
- Backend running (`docker-compose up` or local)
- Frontend dev server running (`cd frontend && npm run dev`)

## Configuration

Tests read configuration from system properties (passed via `-D` flags):

- `env.baseurl` — frontend URL (default: `http://localhost:5173`)
- `test.user.username` — test account username (default: `qaf_test_user`)
- `test.user.password` — test account password (default: `qaf_test_password`)

## Running Tests

```bash
cd e2e-tests

# Run all tests
./gradlew test

# Run headed (non-headless) for debugging
./gradlew test -Ddriver.additional.capabilities='{"goog:chromeOptions":{"args":["--window-size=1920,1080"]}}'
```

## Project Structure

```
e2e-tests/
├── build.gradle.kts                    # Dependencies (Selenium, WebDriverManager, TestNG)
├── settings.gradle.kts                 # Project name
├── src/test/java/com/kavin/fitness/e2e/
│   ├── pages/                          # Page Object classes
│   │   ├── LoginPage.java              # Login form interactions
│   │   ├── TodayPage.java              # Today page (weight, steps, meals, workouts)
│   │   ├── NavigationPage.java         # Sidebar navigation & dark mode
│   │   ├── SettingsPage.java           # Settings page (goals, preferences, integrations)
│   │   ├── TemplatesPage.java          # Templates page (CRUD operations)
│   │   ├── WeightModal.java            # Weight log/edit modal
│   │   ├── MealModal.java              # Meal add/edit modal
│   │   ├── WorkoutBuilderModal.java    # Workout builder (lifting, run, timed)
│   │   └── EditExerciseModal.java      # Exercise edit/delete modal
│   ├── support/                        # Test infrastructure
│   │   ├── BaseTest.java               # Login, driver setup, common helpers
│   │   └── Drivers.java                # Chrome WebDriver factory
│   └── tests/                          # Test classes
│       ├── LoginPageTest.java          # Login form, sign-up toggle, invalid credentials
│       ├── NavigationTest.java         # Sidebar links, active state, dark mode, username
│       ├── WeightTest.java             # Add/edit weight entries
│       ├── StepsTest.java              # Add/edit/delete step entries
│       ├── MealsTest.java              # Add meals, nutrition totals
│       ├── WorkoutLiftingTest.java     # Lifting exercises (add, edit, delete, multi-set)
│       ├── WorkoutRunTest.java         # Run exercises (distance, time, edit)
│       ├── WorkoutTimedTest.java       # Timed activities (duration, edit)
│       ├── WorkoutSessionRenameTest.java # Session create, rename, delete
│       ├── WorkoutMultiExerciseTest.java # Mixed exercise types in one session
│       ├── SettingsPageTest.java       # Goals CRUD, unit toggle, integrations
│       └── TemplatesPageTest.java      # Template create, edit, delete
└── src/test/resources/
    └── testng-config.xml               # TestNG suite config
```

## Test Coverage

| Area           | Tests                                                               |
| -------------- | ------------------------------------------------------------------- |
| Login          | Form elements, title, sign-up toggle, invalid credentials, redirect |
| Navigation     | Sidebar links, active state, page navigation, dark mode, username   |
| Weight         | Add new entry, edit existing entry                                  |
| Steps          | Add, edit, delete                                                   |
| Meals          | Add named meal, totals update, unnamed meal                         |
| Lifting        | Add single set, edit weight, delete, multi-set                      |
| Run            | Add with distance/time, edit distance                               |
| Timed          | Add with duration, verify no weight/distance, edit duration         |
| Session Mgmt   | Create named session, rename, delete                                |
| Multi-Exercise | Mix lifting + run + timed, delete middle exercise                   |
| Settings       | Goals form, save/persist, unit toggle, integrations button          |
| Templates      | Create, edit, delete templates                                      |

## Writing New Tests

1. Create/update page objects in the `pages/` package for new UI elements
2. Write test classes in the `tests/` package extending `BaseTest`
3. Use `step()` for readable test output
4. Use `waitForModalClosed()` after modal interactions
5. Use TestNG `@Test(priority = N, dependsOnMethods = "...")` for ordering
