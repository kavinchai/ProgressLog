# FitTrack — Full-Stack Fitness Tracker

Personal fitness tracking application: weight, nutrition, workouts, strength progression, goals, and milestones.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser / Client                             │
│                                                                     │
│   React 18 + Vite          Zustand          React Router v6        │
│   (plain CSS modules)      (JWT in memory)  (6 pages)              │
│                                                                     │
│   Pages: Dashboard · Nutrition · Workouts · Strength · Goals ·     │
│          Milestones                                                 │
│                                                                     │
│   Recharts — line/bar charts for weight trend, calories, protein,  │
│              and strength progression                               │
│                                                                     │
│   Axios — all HTTP calls go through /api (proxied in dev,          │
│           nginx in prod). Bearer JWT injected automatically.        │
└────────────────────────────┬────────────────────────────────────────┘
                             │  HTTP  /api/**
                             │  Authorization: Bearer <JWT>
┌────────────────────────────▼────────────────────────────────────────┐
│                     Spring Boot 3 — port 8080                       │
│                                                                     │
│  ┌──────────────┐   ┌─────────────────┐   ┌─────────────────────┐  │
│  │  JwtFilter   │   │   Controllers   │   │     Services        │  │
│  │ (reads every │──▶│  /api/auth      │──▶│  WeightService      │  │
│  │  request,    │   │  /api/weight    │   │  NutritionService   │  │
│  │  validates   │   │  /api/nutrition │   │  WorkoutService     │  │
│  │  Bearer JWT, │   │  /api/workouts  │   │  ProgressService    │  │
│  │  sets auth   │   │  /api/progress  │   └────────┬────────────┘  │
│  │  context)    │   └─────────────────┘            │               │
│  └──────────────┘                                  │               │
│                                                    ▼               │
│  ┌──────────────┐   ┌─────────────────────────────────────────┐    │
│  │  JwtUtil     │   │  Spring Data JPA Repositories           │    │
│  │  (generate / │   │  UserRepo · WeightLogRepo               │    │
│  │  validate    │   │  NutritionLogRepo · WorkoutSessionRepo  │    │
│  │  tokens)     │   │  ExerciseSetRepo                        │    │
│  └──────────────┘   └──────────────────┬────────────────────--┘    │
│                                        │  JDBC                     │
│  Spring Security 6 — stateless JWT,    │                           │
│  /api/auth/** public, rest protected   │                           │
└────────────────────────────────────────┼────────────────────────────┘
                                         │
┌────────────────────────────────────────▼────────────────────────────┐
│                     PostgreSQL 15 — port 5432                       │
│                                                                     │
│  Flyway migrations run automatically on startup:                    │
│                                                                     │
│  V1__init.sql      — creates 5 tables                               │
│  V2__seed_data.sql — inserts user + all tracked data                │
│                                                                     │
│  Tables:                                                            │
│  ┌──────────┐  ┌────────────┐  ┌───────────────┐                   │
│  │  users   │  │ weight_log │  │ nutrition_log │                   │
│  └────┬─────┘  └────────────┘  └───────────────┘                   │
│       │        ┌──────────────────┐  ┌──────────────┐              │
│       └───────▶│ workout_session  │─▶│ exercise_set │              │
│                └──────────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

### Request lifecycle (one API call, end to end)

```
Browser
  │  1. User clicks "Nutrition" page
  │  2. useNutrition() hook fires axios GET /api/nutrition
  │     → Axios interceptor reads JWT from Zustand store
  │     → Adds header:  Authorization: Bearer eyJ...
  │
  ▼
Vite dev server (port 5173)
  │  proxy rule: /api → http://localhost:8080
  ▼
Spring Boot (port 8080)
  │  3. JwtFilter runs before the controller
  │     → strips "Bearer " prefix, calls JwtUtil.validateToken()
  │     → if valid, loads User from DB, sets SecurityContext
  │  4. Spring Security checks: is /api/nutrition protected? Yes.
  │     Is SecurityContext populated? Yes → allow through.
  │  5. NutritionController.getNutritionLog() called
  │     → reads authenticated username from SecurityContext
  │     → calls NutritionService → NutritionLogRepository
  │     → queries: SELECT * FROM nutrition_log WHERE user_id = 1
  │  6. Returns JSON list of NutritionLog objects
  ▼
Browser
  │  7. Axios receives response, hook sets data state
  │  8. React re-renders Nutrition page with bar charts
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend framework | React 18 | Component-based UI |
| Frontend build | Vite 5 | Fast dev server, HMR |
| Styling | Plain CSS modules (one `.css` per component) | No framework lock-in |
| Charts | Recharts | Composable SVG charts for React |
| HTTP client | Axios | Interceptors for JWT injection |
| State | Zustand | Minimal, no boilerplate |
| Routing | React Router v6 | Client-side navigation |
| Backend | Spring Boot 3.2 (Java 21) | Production-grade, convention over config |
| Auth | Spring Security 6 + JWT (jjwt 0.12) | Stateless, no sessions |
| ORM | Spring Data JPA / Hibernate | Type-safe DB access |
| Migrations | Flyway | Version-controlled schema changes |
| Database | PostgreSQL 15 | Reliable relational DB |
| Build tool | Gradle (Kotlin DSL) | Flexible, modern build scripts |
| Containerization | Docker + Docker Compose | One-command local dev |
| CI/CD | GitHub Actions | Automated test → build → deploy |
| Backend hosting | AWS ECS Fargate | Serverless containers |
| Frontend hosting | AWS S3 + CloudFront | Static CDN delivery |

---

## Directory Structure

```
WorkoutApp/
├── docker-compose.yml          ← runs all 3 services locally
├── .github/
│   └── workflows/
│       └── deploy.yml          ← CI/CD pipeline
│
├── frontend/
│   ├── Dockerfile              ← Node 20 build → nginx serve
│   ├── nginx.conf              ← SPA routing + /api proxy
│   ├── vite.config.js          ← dev proxy: /api → :8080
│   ├── package.json
│   ├── index.html
│   └── src/
│       ├── main.jsx            ← React entry point
│       ├── App.jsx             ← Router + auth gate
│       ├── styles/
│       │   ├── variables.css   ← design tokens (colors, spacing)
│       │   └── global.css      ← reset + base styles
│       ├── store/
│       │   └── authStore.js    ← Zustand: JWT token (memory only)
│       ├── api/
│       │   └── index.js        ← Axios instance + interceptors
│       ├── hooks/
│       │   ├── useWeightLog.js
│       │   ├── useNutrition.js
│       │   └── useWorkouts.js
│       ├── components/
│       │   └── layout/
│       │       ├── Sidebar.jsx + .css
│       │       └── Navbar.jsx  + .css
│       └── pages/
│           ├── Login.jsx       + .css
│           ├── Dashboard.jsx   + .css  ← weight chart, phase bars
│           ├── Nutrition.jsx   + .css  ← calorie/protein bar charts
│           ├── Workouts.jsx    + .css  ← session completion log
│           ├── Strength.jsx    + .css  ← progressive overload chart
│           ├── Goals.jsx       + .css  ← phase targets + adherence
│           └── Milestones.jsx  + .css  ← achievement timeline
│
└── backend/
    ├── Dockerfile              ← gradle:8.6-jdk21 build → jre run
    ├── build.gradle.kts        ← Gradle Kotlin DSL
    ├── settings.gradle.kts
    └── src/main/
        ├── resources/
        │   ├── application.properties   ← all secrets from env vars
        │   └── db/migration/
        │       ├── V1__init.sql         ← schema (5 tables)
        │       └── V2__seed_data.sql    ← all seed data
        └── java/com/kavin/fitness/
            ├── FitnessApplication.java
            ├── security/
            │   ├── JwtUtil.java             ← generate/validate tokens
            │   ├── JwtFilter.java           ← reads Bearer on every req
            │   ├── SecurityConfig.java      ← route protection rules
            │   └── UserDetailsServiceImpl.java
            ├── model/                       ← JPA entities
            │   ├── User.java
            │   ├── WeightLog.java
            │   ├── NutritionLog.java
            │   ├── WorkoutSession.java
            │   └── ExerciseSet.java
            ├── repository/                  ← Spring Data interfaces
            ├── dto/                         ← request/response shapes
            ├── service/                     ← business logic
            └── controller/                  ← REST endpoints
```

---

## API Endpoints

| Method | URL | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Returns JWT token |
| `GET` | `/api/weight` | Required | Weight log (sorted by date) |
| `GET` | `/api/nutrition` | Required | Nutrition log (calories, protein, steps) |
| `GET` | `/api/workouts` | Required | Workout sessions with exercise sets |
| `GET` | `/api/progress/strength` | Required | Per-lift progression over time |
| `GET` | `/api/progress/milestones` | Required | Achievement/setback timeline |

### Login request/response

```json
// POST /api/auth/login
{ "username": "kavin", "password": "password" }

// Response
{ "token": "eyJ...", "username": "kavin" }
```

---

## Running Locally

### Prerequisites
- Docker Desktop

### One command

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend:  http://localhost:8080
- Database: localhost:5432 (user: `fitness`, pass: `***REDACTED_PASSWORD***`, db: `fitness`)

Register a new account through the UI to get started.

### Without Docker (development mode)

**Start Postgres** (Docker only):
```bash
docker compose up postgres -d
```

**Backend:**
```bash
cd backend
# Requires Gradle installed, or run: gradle wrapper --gradle-version 8.6 first
gradle bootRun -Pargs=\
  --DB_URL=jdbc:postgresql://localhost:5432/fitness,\
  --DB_USERNAME=fitness,\
  --DB_PASSWORD=***REDACTED_PASSWORD***,\
  --JWT_SECRET=***REDACTED_JWT_SECRET***
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev    # http://localhost:5173  (Vite proxies /api → :8080)
```

---

## CI/CD Pipeline

```
git push → main
    │
    ├─ test job
    │   ├── npm test  (Jest, frontend)
    │   └── gradle test  (JUnit, backend)
    │
    ├─ build-and-push job  (only on main push, not PRs)
    │   ├── docker build backend  → push to ECR
    │   └── docker build frontend → push to ECR
    │
    ├─ deploy-backend job
    │   └── aws ecs update-service --force-new-deployment
    │
    └─ deploy-frontend job
        ├── npm run build
        ├── aws s3 sync dist/ → S3 bucket
        └── aws cloudfront create-invalidation
```

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `AWS_ACCOUNT_ID` | Your 12-digit AWS account ID |
| `AWS_ACCESS_KEY_ID` | IAM key with ECR/ECS/S3/CF permissions |
| `AWS_SECRET_ACCESS_KEY` | IAM secret |
| `S3_BUCKET` | S3 bucket name for frontend assets |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID |
| `PRODUCTION_API_URL` | Backend URL for `VITE_API_URL` build var |

---

## Database Schema

```
users
  id, username, password (BCrypt), email, created_at

weight_log                          nutrition_log
  id, user_id → users               id, user_id → users
  log_date, weight_lbs              log_date, calories, protein_grams
                                    day_type ('training'|'rest'), steps

workout_session                     exercise_set
  id, user_id → users               id, session_id → workout_session
  session_date, session_name        exercise_name, set_number
  completion_pct                    reps, weight_lbs, completed
```

Flyway runs migrations automatically when the backend starts. `V1` creates the schema, `V2` seeds all your data.

---

## Known Issues / Notes

- **`2026-02-29` is invalid** — 2026 is not a leap year. Those three entries (weight, nutrition, workout) are commented out in `V2__seed_data.sql`. Edit the file to use a different date if you need them.
- **BCrypt hash** — The seed user's password is hashed in `V2__seed_data.sql`. If login fails, regenerate the hash: `new BCryptPasswordEncoder().encode("yourpassword")` and update the SQL.
- **JWT is memory-only** — Refreshing the browser logs you out (by design — no `localStorage`).
- **Gradle wrapper** — The `Dockerfile` uses the `gradle` binary from the base image directly. To use `./gradlew` locally, run `gradle wrapper --gradle-version 8.6` once inside `backend/`.
