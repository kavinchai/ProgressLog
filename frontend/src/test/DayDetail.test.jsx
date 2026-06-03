/**
 * DayDetail (History day expansion) — workout add behavior.
 *
 * Mirrors Today: when a single workout session already exists for the day,
 * the workout "+ Add" button should append an exercise to that session
 * (existingSession + appendBlankExercise) rather than create a brand-new workout.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DayDetail from '../components/DayDetail';

// ── Modal stubs — each records the props it received ──────────────────────────
vi.mock('../components/WorkoutBuilderModal', () => ({
  default: ({ existingSession, appendBlankExercise, onClose }) => (
    <div data-testid="workout-modal"
         data-existing-session-id={existingSession?.id ?? ''}
         data-append-blank={appendBlankExercise ? 'true' : 'false'}>
      <button onClick={onClose}>modal-close</button>
    </div>
  ),
}));
vi.mock('../components/WeightModal',    () => ({ default: () => <div data-testid="weight-modal" /> }));
vi.mock('../components/DayInfoModal',   () => ({ default: () => <div data-testid="dayinfo-modal" /> }));
vi.mock('../components/MealModal',      () => ({ default: () => <div data-testid="meal-modal" /> }));
vi.mock('../components/EditExerciseModal', () => ({ default: () => <div data-testid="edit-exercise-modal" /> }));
vi.mock('../components/ConfirmDeleteModal', () => ({ default: () => <div data-testid="confirm-delete-modal" /> }));

vi.mock('../api', () => ({ default: { delete: vi.fn(), post: vi.fn(), put: vi.fn() } }));

vi.mock('../hooks/useWeightUnit', () => ({
  default: () => ({ unit: 'lbs', toDisplay: (x) => x }),
}));
vi.mock('../hooks/useDayActions', () => ({
  useDayActions: () => ({
    renamingSession: false,
    setRenamingSession: vi.fn(),
    renameValue: '',
    setRenameValue: vi.fn(),
    deleteWeight: vi.fn(),
    deleteNutritionDay: vi.fn(),
    deleteWorkoutSession: vi.fn(),
    submitRename: vi.fn(),
    saveSteps: vi.fn(),
    getOrCreateNutritionLogId: vi.fn(),
  }),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────
const DATE = '2026-05-01';

const SINGLE_SESSION = {
  id: 10, sessionDate: DATE, sessionName: 'Push', _sessionCount: 1,
  exerciseSets: [
    { id: 1, exerciseName: 'Bench Press', setNumber: 1, reps: 8, weightLbs: 135, _sessionId: 10 },
  ],
};
const MULTI_SESSION = {
  id: 10, sessionDate: DATE, sessionName: 'Push', _sessionCount: 2,
  exerciseSets: [
    { id: 1, exerciseName: 'Bench Press', setNumber: 1, reps: 8, weightLbs: 135, _sessionId: 10 },
    { id: 2, exerciseName: 'Squat',       setNumber: 1, reps: 5, weightLbs: 225, _sessionId: 11 },
  ],
};

// Give weight + steps real entries so those sections render "Edit", leaving the
// workout section as the only "+ Add" button on screen.
function renderDetail(workoutEntry) {
  return render(
    <DayDetail
      date={DATE}
      weightEntry={{ id: 99, logDate: DATE, weightLbs: 185 }}
      nutritionEntry={null}
      workoutEntry={workoutEntry}
      stepEntry={{ id: 98, logDate: DATE, steps: 8000 }}
      onRefetchW={vi.fn()}
      onRefetchN={vi.fn()}
      onRefetchWo={vi.fn()}
      onRefetchS={vi.fn()}
    />
  );
}

beforeEach(() => { vi.clearAllMocks(); });

describe('DayDetail — workout add', () => {
  it('creates a new workout when no session exists for the day', async () => {
    renderDetail(null);
    await userEvent.click(screen.getByRole('button', { name: /^\+ Add$/i }));
    const modal = screen.getByTestId('workout-modal');
    expect(modal.dataset.existingSessionId).toBe('');
    expect(modal.dataset.appendBlank).toBe('false');
  });

  it('appends an exercise to the existing single session', async () => {
    renderDetail(SINGLE_SESSION);
    await userEvent.click(screen.getByRole('button', { name: /\+ Add exercise/i }));
    const modal = screen.getByTestId('workout-modal');
    expect(modal.dataset.existingSessionId).toBe('10');
    expect(modal.dataset.appendBlank).toBe('true');
  });

  it('falls back to creating a new workout when the day has multiple sessions', async () => {
    renderDetail(MULTI_SESSION);
    await userEvent.click(screen.getByRole('button', { name: /^\+ Add$/i }));
    const modal = screen.getByTestId('workout-modal');
    expect(modal.dataset.existingSessionId).toBe('');
    expect(modal.dataset.appendBlank).toBe('false');
  });
});
