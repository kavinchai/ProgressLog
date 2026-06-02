# Project Instructions

## Codebase Map

Use this to navigate straight to the relevant file instead of searching the whole tree. Paths are stable; line numbers are not — open the file to confirm specifics.

**Top level**
- `frontend/` — React + Vite SPA (Vitest tests)
- `backend/` — Spring Boot REST API, Gradle (JUnit tests)
- `e2e-tests/` — Playwright + TestNG, page-object pattern (Gradle)
- `mcp-server/` — Node MCP server exposing the app's data as tools (`server.js`)
- `docker-compose.yml`, `.github/workflows/` — deploy, DB backup, scheduled calendar jobs

**Frontend** (`frontend/src/`)
- `pages/` — one component per route (Today, History, Progress, Settings, Community, Login, Cardio, Strength, WeeklyStats, TotalStats, SharedCalendar, SplashPage, ClaudeSetup). Routing in `App.jsx`.
- `components/` — shared UI. Modals build on `Modal.jsx` (focus-trap + Esc + scroll-lock). Notables: `WorkoutBuilderModal`, `EditExerciseModal`, `MealModal`, `WeightModal`, `DayInfoModal`, `ConfirmDeleteModal` (delete-with-undo), `BodyMap` + `MuscleDetailPanel`.
- `hooks/` — data hooks (`useWorkouts`, `useNutrition`, `useWeightLog`, `useSteps`, `usePRs`, `useUserProfile`), all fetching through `useFetch.js` (returns `{ data, loading, error, refetch }`). Also `useDayActions` (Today's mutations), `useTheme`, `useToday`, `useWeightUnit`.
- `store/` — Zustand stores: `authStore`, `unitStore`.
- `api/index.js` — axios instance (`baseURL` `/api`, cookies, auto-logout on 401).
- `utils/` — pure helpers: `date`, `stats`, `workout`, `muscleMapping`, `constants`.
- `styles/` — `variables.css` (design tokens) + `global.css` (buttons, section-box, notice, responsive).
- `test/` — Vitest + React Testing Library, mirrors the source tree.

**Backend** (`backend/src/main/java/com/kavin/fitness/`)
- `controller/` — REST endpoints, one per domain (Auth, Workout, Nutrition, Step, Weight, Progress, Leaderboard, SharedCalendar, Import, Undo). `GlobalExceptionHandler`, `UserResolver` shared.
- `service/` — business logic mirroring controllers; `UndoService` + `DeletionJournalService`/`PurgeJob` back the delete-undo feature.
- `repository/` — Spring Data JPA repos, one per entity.
- `model/` — JPA entities (User, WorkoutSession, ExerciseSet, NutritionLog, Meal, StepLog, WeightLog, DeletionJournalEntry).
- `dto/` — request/response DTOs (+ `dto/snapshot/` for undo snapshots).
- `security/` — JWT auth (`JwtFilter`, `JwtUtil`, `CookieUtil`, `SecurityConfig`).

**E2E** (`e2e-tests/src/test/java/com/kavin/fitness/e2e/`)
- `pages/` — page objects (selectors + actions), one per screen/modal.
- `tests/` — TestNG assertion classes, one per flow.
- `support/` — `BaseTest`, `Browsers`, `TestApiClient` (seeds data via the API).

## Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## Surgical Changes

Touch only what you must. Clean up only your own mess.

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

## Test-Driven Development

When implementing a new feature or behavior change:

1. **Write tests first** — Before writing implementation code, create tests that describe the expected behavior. Tests should fail initially (red phase).
2. **Implement the feature** — Write the minimum code needed to make the new tests pass (green phase).
3. **Verify all tests pass** — Run the full test suite. The feature is NOT complete until all tests pass.
   - Frontend: `cd frontend && npx vitest run`
   - Backend:  `cd backend && gradle test`
   - E2E:      `cd e2e-tests && gradle test` (requires frontend dev server + backend running)
4. **Do not break existing tests** — If a new feature changes behavior that existing tests cover, do NOT silently modify those tests. Instead, ask the user for confirmation before updating any pre-existing test. Explain what changed and why the old test expectation is no longer valid.
5. **Review existing tests across all three layers on every change** — Whenever code is modified (feature, fix, refactor, rename, or UI tweak), audit the existing frontend, backend, AND e2e tests for updates they may need, then run all three suites (per item 3). Delegate this to the `test-reviewer` agent, which owns the detailed guidance — cross-layer impact, selectors/labels that *pass by coincidence*, and `waitFor` visibility checks — along with its reporting rules.
6. **Use as much existing code as possible** — Look through the project for all existing code and try to reuse as much as possible before generating new code.

### Test expectations

- Frontend tests live in `frontend/src/test/` and use Vitest + React Testing Library.
- Backend tests live in `backend/src/test/java/` and use JUnit + Spring Boot Test (run with `gradle test`).
- E2E tests live in `e2e-tests/src/test/java/com/kavin/fitness/e2e/` and use Playwright + TestNG via the page-object pattern (`pages/` for selectors and actions, `tests/` for assertions). New user-facing flows should add a page-object method *and* a test class.
- Every new user-facing feature should have at least one integration-style test that simulates the user interaction end-to-end (open modal → fill form → submit → verify API call / display).
- Unit tests for utility functions when non-trivial logic is added.

### E2E page objects

When writing or reviewing e2e tests, use Playwright's `Locator.waitFor()` (not `count() > 0`) for visibility checks on async- or transition-dependent elements. See the `test-reviewer` agent for the full rationale and the `HistoryPage.awaitVisible` helper.

## Build tools

- This project uses **Gradle** (`build.gradle.kts`), not Maven. Never invoke `mvn` — always `gradle` or `./gradlew`.

## After Every Code Change

At the end of every response where code was modified, append a single-line suggested commit message summarizing what was changed. Format:

```
`<one-line commit message>`
```

## Misc

When my context-window usage crosses 89%, tell me before continuing so I can decide whether to `/clear` or compact.
