# ProgressLog — Full-Stack Fitness Tracker

Personal fitness tracking application: daily logging for weight, nutrition, and workouts, with strength progression analytics, personal records, workout templates, and Google Calendar integration.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser / Client                             │
│                                                                     │
│   React 18 + Vite          Zustand          React Router v6         │
│   (plain CSS modules)      (JWT in memory)  (12 pages)              │
│                                                                     │
│   Pages: Today · Dashboard · Nutrition · Workouts · Strength ·      │
│          WeeklyStats · TotalStats · Templates · Settings ·          │
│          Goals · Milestones · Login                                 │
│                                                                     │
│   Recharts — line/bar charts for weight trend, calories, protein,   │
│              and strength progression                               │
│                                                                     │
│   Axios — all HTTP calls go through /api (proxied in dev,           │
│           nginx in prod). Bearer JWT injected automatically.        │
└────────────────────────────┬────────────────────────────────────────┘
                             │  HTTP  /api/**
                             │  Authorization: Bearer <JWT>
┌────────────────────────────▼────────────────────────────────────────┐
│                     Spring Boot 3 — port 8080                       │
│                                                                     │
│  ┌──────────────┐   ┌─────────────────┐   ┌─────────────────────┐   │
│  │  JwtFilter   │   │   Controllers   │   │     Services        │   │
│  │ (reads every │──▶│  /api/auth      │──▶│  WeightService      │   │
│  │  request,    │   │  /api/weight    │   │  NutritionService   │   │
│  │  validates   │   │  /api/nutrition │   │  WorkoutService     │   │
│  │  Bearer JWT, │   │  /api/workouts  │   │  ProgressService    │   │
│  │  sets auth   │   │  /api/progress  │   │  WorkoutTemplate-   │   │
│  │  context)    │   │  /api/templates │   │    Service          │   │
│  └──────────────┘   │  /api/profile   │   │  ImportService      │   │
│                     │  /api/import    │   └────────┬────────────┘   │
│  ┌──────────────┐   └─────────────────┘            │                │
│  │  JwtUtil     │                                  ▼                │
│  │  (generate / │   ┌─────────────────────────────────────────┐     │
│  │  validate    │   │  Spring Data JPA Repositories           │     │
│  │  tokens)     │   │  UserRepo · WeightLogRepo · MealRepo    │     │
│  └──────────────┘   │  NutritionLogRepo · WorkoutSessionRepo  │     │
│                     │  ExerciseSetRepo · WorkoutTemplateRepo  │     │
│  Spring Security 6  └──────────────────┬────────────────────--┘     │
│  stateless JWT,                        │  JDBC                      │
│  /api/auth/** public                   │                            │
│  all other /api/** protected           │                            │
└────────────────────────────────────────┼────────────────────────────┘
                                         │
┌────────────────────────────────────────▼────────────────────────────┐
│                     PostgreSQL 15 — port 5432                       │
│                                                                     │
│  Flyway migrations (V1–V6) run automatically on startup             │
│                                                                     │
│  Tables:                                                            │
│  ┌──────────┐  ┌────────────┐  ┌───────────────┐  ┌──────────┐      │
│  │  users   │  │ weight_log │  │ nutrition_log │  │   meal   │      │
│  └────┬─────┘  └────────────┘  └───────────────┘  └──────────┘      │
│       │        ┌──────────────────┐  ┌──────────────┐               │
│       ├───────▶│ workout_session  │─▶│ exercise_set │               │
│       │        └──────────────────┘  └──────────────┘               │
│       │        ┌──────────────────┐  ┌───────────────────┐          │
│       └───────▶│workout_template  │─▶│ template_exercise │          │
│                └──────────────────┘  └───────────────────┘          │
└─────────────────────────────────────────────────────────────────────┘

  External:
  ┌────────────────────────────────────────────────────┐
  │  GitHub Actions (cron, daily 5am UTC)              │
  │  Python scripts query DB directly → push events    │
  │  to Google Calendar via Calendar API v3            │
  └────────────────────────────────────────────────────┘
```

### Request lifecycle (one API call, end to end)

```
Browser
  │  1. User clicks "Today" page
  │  2. useFetch() hook fires axios GET /api/workouts
  │     → Axios interceptor reads JWT from Zustand store
  │     → Adds header:  Authorization: Bearer <token>
  │
  ▼
Vite dev server (port 5173)
  │  proxy rule: /api → http://localhost:8080
  ▼
Spring Boot (port 8080)
  │  3. JwtFilter runs before the controller
  │     → strips "Bearer " prefix, calls JwtUtil.validateToken()
  │     → if valid, loads User from DB, sets SecurityContext
  │  4. Spring Security checks: is /api/workouts protected? Yes.
  │     Is SecurityContext populated? Yes → allow through.
  │  5. WorkoutController.getWorkouts() called
  │     → reads authenticated username from SecurityContext
  │     → calls WorkoutService → WorkoutSessionRepository
  │     → JOIN FETCH query loads sessions with exercise sets
  │  6. Returns JSON list of WorkoutSessionDTO objects
  ▼
Browser
  │  7. Axios receives response, hook sets data state
  │  8. React re-renders Today page with workout data
```

---

## Tech Stack

| Layer              | Technology                                   | Why                                      |
| ------------------ | -------------------------------------------- | ---------------------------------------- |
| Frontend framework | React 18                                     | Component-based UI                       |
| Frontend build     | Vite 5                                       | Fast dev server, HMR                     |
| Styling            | Plain CSS modules (one `.css` per component) | No framework lock-in                     |
| Charts             | Recharts                                     | Composable SVG charts for React          |
| HTTP client        | Axios                                        | Interceptors for JWT injection           |
| State              | Zustand                                      | Minimal, no boilerplate                  |
| Routing            | React Router v6                              | Client-side navigation                   |
| Backend            | Spring Boot 3.2 (Java 21)                    | Production-grade, convention over config |
| Auth               | Spring Security 6 + JWT (jjwt 0.12)          | Stateless, no sessions                   |
| ORM                | Spring Data JPA / Hibernate                  | Type-safe DB access                      |
| Migrations         | Flyway                                       | Version-controlled schema changes        |
| Database           | PostgreSQL 15                                | Reliable relational DB                   |
| Build tool         | Gradle (Kotlin DSL)                          | Flexible, modern build scripts           |
| Containerization   | Docker + Docker Compose                      | One-command local dev                    |
| CI/CD              | GitHub Actions                               | Automated testing on push/PR             |
| Testing (frontend) | Vitest + React Testing Library               | Fast, Vite-native test runner            |
| Testing (backend)  | JUnit 5 + Mockito                            | Standard Spring Boot testing             |

---

## Directory Structure

```
WorkoutApp/
├── docker-compose.yml              ← runs all services locally
├── .github/
│   └── workflows/
│       ├── deploy.yml              ← CI pipeline (test on push/PR)
│       ├── daily-weight-calendar.yml   ← cron: sync weight to Google Calendar
│       └── daily-workout-calendar.yml  ← cron: sync workouts to Google Calendar
│
├── frontend/
│   ├── Dockerfile                  ← Node 20 build → nginx serve
│   ├── nginx.conf                  ← SPA routing + /api proxy
│   ├── vite.config.js              ← dev proxy: /api → :8080
│   ├── package.json
│   ├── index.html
│   └── src/
│       ├── main.jsx                ← React entry point
│       ├── App.jsx                 ← Router + auth gate
│       ├── styles/
│       │   ├── variables.css       ← design tokens (colors, spacing)
│       │   └── global.css          ← reset + base styles
│       ├── store/
│       │   └── authStore.js        ← Zustand: JWT token (memory only)
│       ├── api/
│       │   └── index.js            ← Axios instance + interceptors
│       ├── hooks/
│       │   ├── useFetch.js         ← generic data-fetching hook
│       │   ├── useWeightLog.js
│       │   ├── useNutrition.js
│       │   ├── useWorkouts.js
│       │   ├── useTemplates.js
│       │   ├── usePRs.js
│       │   ├── useUserProfile.js
│       │   └── useTheme.js
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Sidebar.jsx + .css
│       │   │   └── Navbar.jsx  + .css
│       │   ├── Modal.jsx           ← reusable modal wrapper
│       │   ├── WorkoutBuilderModal.jsx
│       │   ├── TemplateBuilderModal.jsx
│       │   ├── EditExerciseModal.jsx
│       │   ├── MealModal.jsx
│       │   ├── WeightModal.jsx
│       │   ├── DayInfoModal.jsx
│       │   └── DayDetail.jsx
│       ├── pages/
│       │   ├── Login.jsx       + .css
│       │   ├── Today.jsx       + .css  ← daily hub: weight, meals, workouts
│       │   ├── Dashboard.jsx   + .css  ← weight chart, overview
│       │   ├── Nutrition.jsx   + .css  ← calorie/protein bar charts
│       │   ├── Workouts.jsx    + .css  ← session history
│       │   ├── Strength.jsx    + .css  ← progressive overload chart
│       │   ├── WeeklyStats.jsx + .css  ← weekly calorie/protein trends
│       │   ├── TotalStats.jsx  + .css  ← lifetime statistics
│       │   ├── Templates.jsx   + .css  ← workout template management
│       │   ├── Settings.jsx    + .css  ← profile, goals, credentials
│       │   ├── Goals.jsx       + .css  ← phase targets + adherence
│       │   └── Milestones.jsx  + .css  ← achievement timeline
│       └── test/
│           ├── setup.js                ← Vitest test setup
│           ├── api.test.js
│           ├── authStore.test.js
│           ├── useFetch.test.js
│           ├── useWorkouts.test.js
│           ├── useTheme.test.js
│           ├── useUserProfile.test.js
│           ├── utils.date.test.js
│           ├── utils.workout.test.js
│           ├── App.test.jsx
│           ├── Login.test.jsx
│           ├── Today.test.jsx
│           ├── Settings.test.jsx
│           ├── Templates.test.jsx
│           ├── Modal.test.jsx
│           ├── DayInfoModal.test.jsx
│           ├── EditExerciseModal.test.jsx
│           ├── MealModal.test.jsx
│           ├── WeightModal.test.jsx
│           └── WorkoutBuilderModal.test.jsx
│
├── backend/
│   ├── Dockerfile                  ← gradle:8.6-jdk21 build → jre run
│   ├── build.gradle.kts            ← Gradle Kotlin DSL
│   ├── settings.gradle.kts
│   └── src/
│       ├── main/
│       │   ├── resources/
│       │   │   ├── application.properties       ← config (secrets from env vars)
│       │   │   └── db/migration/
│       │   │       ├── V1__init.sql             ← schema (5 core tables)
│       │   │       ├── V2__seed_data.sql        ← initial seed data
│       │   │       ├── V3__meal_and_workout_refactor.sql  ← adds meal table
│       │   │       ├── V4__user_goals.sql       ← nutrition targets on users
│       │   │       ├── V5__remove_seed_user.sql ← cleans up seed data
│       │   │       └── V6__workout_templates.sql ← template tables
│       │   └── java/com/kavin/fitness/
│       │       ├── FitnessApplication.java
│       │       ├── security/
│       │       │   ├── JwtUtil.java
│       │       │   ├── JwtFilter.java
│       │       │   ├── SecurityConfig.java
│       │       │   └── UserDetailsServiceImpl.java
│       │       ├── model/
│       │       │   ├── User.java
│       │       │   ├── WeightLog.java
│       │       │   ├── NutritionLog.java
│       │       │   ├── Meal.java
│       │       │   ├── WorkoutSession.java
│       │       │   ├── ExerciseSet.java
│       │       │   ├── WorkoutTemplate.java
│       │       │   └── TemplateExercise.java
│       │       ├── repository/
│       │       ├── dto/
│       │       ├── service/
│       │       │   ├── WeightService.java
│       │       │   ├── NutritionService.java
│       │       │   ├── WorkoutService.java
│       │       │   ├── ProgressService.java
│       │       │   ├── WorkoutTemplateService.java
│       │       │   └── ImportService.java
│       │       └── controller/
│       │           ├── AuthController.java
│       │           ├── WeightController.java
│       │           ├── NutritionController.java
│       │           ├── WorkoutController.java
│       │           ├── ProgressController.java
│       │           ├── WorkoutTemplateController.java
│       │           ├── ProfileController.java
│       │           └── ImportController.java
│       └── test/
│           └── java/com/kavin/fitness/
│               ├── security/JwtUtilTest.java
│               └── service/WorkoutServiceTest.java
│
└── docs/
    └── data-flow-diagram.html      ← interactive architecture diagram
```

---

## API Endpoints

| Method   | URL                            | Auth     | Description                         |
| -------- | ------------------------------ | -------- | ----------------------------------- |
| `POST`   | `/api/auth/register`           | Public   | Create account, returns JWT         |
| `POST`   | `/api/auth/login`              | Public   | Authenticate, returns JWT           |
| `GET`    | `/api/weight`                  | Required | Weight log (sorted by date)         |
| `POST`   | `/api/weight`                  | Required | Log a weight entry                  |
| `DELETE` | `/api/weight/{id}`             | Required | Delete a weight entry               |
| `GET`    | `/api/nutrition`               | Required | Nutrition logs with meals           |
| `POST`   | `/api/nutrition`               | Required | Create/update daily nutrition log   |
| `DELETE` | `/api/nutrition/{id}`          | Required | Delete a nutrition log              |
| `POST`   | `/api/nutrition/{id}/meals`    | Required | Add a meal to a log                 |
| `PUT`    | `/api/nutrition/meals/{id}`    | Required | Update a meal                       |
| `DELETE` | `/api/nutrition/meals/{id}`    | Required | Delete a meal                       |
| `GET`    | `/api/workouts`                | Required | Workout sessions with exercise sets |
| `POST`   | `/api/workouts`                | Required | Log a new workout session           |
| `PATCH`  | `/api/workouts/{id}`           | Required | Update session (e.g., rename)       |
| `DELETE` | `/api/workouts/{id}`           | Required | Delete a workout session            |
| `POST`   | `/api/workouts/{id}/exercises` | Required | Add/update exercises in a session   |
| `DELETE` | `/api/workouts/{id}/exercises` | Required | Remove exercises from a session     |
| `GET`    | `/api/progress/strength`       | Required | Per-exercise strength progression   |
| `GET`    | `/api/progress/prs`            | Required | Personal records per exercise       |
| `GET`    | `/api/progress/milestones`     | Required | Achievement timeline                |
| `GET`    | `/api/templates`               | Required | List workout templates              |
| `POST`   | `/api/templates`               | Required | Create a workout template           |
| `PUT`    | `/api/templates/{id}`          | Required | Update a template                   |
| `DELETE` | `/api/templates/{id}`          | Required | Delete a template                   |
| `GET`    | `/api/profile/goals`           | Required | Get user nutrition goals            |
| `PUT`    | `/api/profile/goals`           | Required | Update nutrition goals              |
| `PUT`    | `/api/profile/email`           | Required | Update email address                |
| `PUT`    | `/api/profile/credentials`     | Required | Update username/password            |
| `POST`   | `/api/import`                  | Required | Bulk import from CSV/Excel          |

### Example: Login

```json
// POST /api/auth/login
{ "username": "youruser", "password": "yourpass" }

// Response 200
{ "token": "eyJhbG...", "username": "youruser" }
```

### Example: Log a Workout

```json
// POST /api/workouts
{
	"sessionDate": "2026-04-10",
	"sessionName": "Upper Body",
	"exercises": [
		{
			"exerciseName": "Bench Press",
			"sets": [
				{ "setNumber": 1, "reps": 8, "weightLbs": 185.0 },
				{ "setNumber": 2, "reps": 8, "weightLbs": 185.0 }
			]
		}
	]
}
```

---

## Running Locally

### Prerequisites

- Docker Desktop

### One command

```bash
docker compose up --build
```

| Service     | URL                   |
| ----------- | --------------------- |
| Frontend    | http://localhost:5173 |
| Backend API | http://localhost:8080 |
| pgAdmin     | http://localhost:5050 |
| PostgreSQL  | `localhost:5432`      |

Register a new account through the UI to get started.

### Without Docker (development mode)

**Start Postgres** (Docker only):

```bash
docker compose up postgres -d
```

**Backend** (requires JDK 21):

```bash
cd backend
gradle bootRun
```

The backend reads database and JWT configuration from environment variables. Copy `application-local.properties.example` or set these env vars:

| Variable            | Description                                                               |
| ------------------- | ------------------------------------------------------------------------- |
| `DB_URL`            | JDBC connection string (e.g., `jdbc:postgresql://localhost:5432/fitness`) |
| `DB_USERNAME`       | Database username                                                         |
| `DB_PASSWORD`       | Database password                                                         |
| `JWT_SECRET`        | Signing key (minimum 32 characters)                                       |
| `JWT_EXPIRATION_MS` | Token lifetime in ms (default: `86400000` = 24h)                          |

**Frontend** (requires Node 20+):

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173  (Vite proxies /api → :8080)
```

---

## Testing

**Frontend** (Vitest + React Testing Library):

```bash
cd frontend
npm test
```

20 test files covering hooks, components, modals, pages, and utility functions.

**Backend** (JUnit 5 + Mockito):

```bash
cd backend
gradle test
```

Tests for JWT utilities and workout service logic.

---

## CI/CD Pipeline

```
git push → main (or PR)
    │
    ├─ Frontend test job (Node 20)
    │   └── npm test
    │
    └─ Backend test job (JDK 21)
        └── gradle test
```

Tests run on every push and pull request to `main`. Test reports are uploaded as artifacts.

### Google Calendar Sync (Scheduled Workflows)

Two GitHub Actions run on a daily cron (5am UTC):

- **daily-weight-calendar.yml** — syncs weight log entries to Google Calendar
- **daily-workout-calendar.yml** — syncs workout sessions (with exercise details) to Google Calendar

These use Python scripts that query the database directly and create calendar events via the Google Calendar API v3 with service account authentication. Duplicate detection prevents re-creating events on re-runs.

### Required GitHub Secrets

| Secret                        | Description                                          |
| ----------------------------- | ---------------------------------------------------- |
| `RAILWAY_DATABASE_URL`        | PostgreSQL connection string for the hosted database |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | GCP service account credentials (JSON)               |
| `GOOGLE_CALENDAR_ID`          | Target Google Calendar ID                            |

---

## Database Schema

```
users
  id, username, password (BCrypt), email, created_at,
  calorie_target_training, calorie_target_rest, protein_target

weight_log                          nutrition_log
  id, user_id → users               id, user_id → users
  log_date, weight_lbs              log_date, day_type, steps
  UNIQUE(user_id, log_date)         UNIQUE(user_id, log_date)

meal                                 ↑ belongs to nutrition_log
  id, nutrition_log_id               meal_name, calories, protein_grams

workout_session                     exercise_set
  id, user_id → users               id, session_id → workout_session
  session_date, session_name        exercise_name, set_number
                                    reps, weight_lbs, completed

workout_template                    template_exercise
  id, user_id → users               id, template_id → workout_template
  template_name                     exercise_name, set_count,
                                    default_reps, default_weight
```

Flyway runs migrations automatically when the backend starts. V1 creates the core schema, V3 adds the meal table, V4 adds user nutrition goals, V6 adds workout templates.

---

## Features

- **Daily tracking** — Log weight, meals (with per-meal calorie/protein), and workouts from the Today page
- **Workout builder** — Build sessions exercise-by-exercise with sets, reps, and weight; or start from a saved template
- **Workout templates** — Save and reuse common workout structures
- **Nutrition goals** — Set calorie targets for training/rest days and a protein target; track adherence
- **Strength progression** — Chart weight lifted over time for each exercise
- **Personal records** — Automatically computed PRs per exercise
- **Weekly & lifetime stats** — Aggregated views of calorie, protein, and workout trends
- **Data import** — Bulk import historical data from CSV or Excel
- **Google Calendar sync** — Automated daily sync of workouts and weight to Google Calendar
- **Dark/light theme** — Toggle via the theme hook
- **JWT auth** — Stateless, memory-only token storage (no localStorage)
- **Responsive layout** — Sidebar navigation with collapsible mobile view

---

## Documentation

- **[Data Flow Diagram](docs/data-flow-diagram.html)** — Interactive visual diagram of the full architecture, with technical explanations for each layer

---

## Notes

- **JWT is memory-only** — Refreshing the browser logs you out (by design — no `localStorage`).
- **Gradle wrapper** — The Dockerfile uses the `gradle` binary from the base image. To use `./gradlew` locally, run `gradle wrapper --gradle-version 8.6` once inside `backend/`.
- **Flyway migrations are append-only** — Never modify existing migration files; create a new `V{N}__description.sql` instead.
