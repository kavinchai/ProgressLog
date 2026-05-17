/**
 * Today page — visual and interaction tests.
 *
 * Each test answers one of three questions:
 *   DISPLAY  — is the data actually shown on the page?
 *   OPENS    — does clicking a button make the right modal appear?
 *   ACTION   — does clicking delete/rename call the API and trigger a refetch?
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Today from '../pages/Today';

// ── Static mocks ─────────────────────────────────────────────────────────────

vi.mock('../pages/Today.css', () => ({}));

// Fix the date so TODAY constant in Today.jsx is predictable
vi.mock('../utils/date', () => ({
  localDateStr:    () => '2026-04-10',
  formatDateFull:  () => '4/10/2026',
}));

// Stub all modals — they have their own test files.
// Each stub records which props it received so tests can inspect them.
vi.mock('../components/WeightModal', () => ({
  default: ({ existing, onClose, onSaved }) => (
    <div data-testid="weight-modal" data-existing-id={existing?.id ?? ''}>
      <button onClick={onSaved}>modal-save</button>
      <button onClick={onClose}>modal-close</button>
    </div>
  ),
}));
vi.mock('../components/WorkoutBuilderModal', () => ({
  default: ({ prefillExercises, existingSession, appendBlankExercise, onClose }) => (
    <div data-testid="workout-modal"
         data-prefill={prefillExercises ? JSON.stringify(prefillExercises) : ''}
         data-existing-session-id={existingSession?.id ?? ''}
         data-append-blank={appendBlankExercise ? 'true' : 'false'}>
      <button onClick={onClose}>modal-close</button>
    </div>
  ),
}));
vi.mock('../components/EditExerciseModal', () => ({
  default: ({ exerciseName, sessionId, onClose }) => (
    <div data-testid="edit-exercise-modal"
         data-name={exerciseName}
         data-session={sessionId}>
      <button onClick={onClose}>modal-close</button>
    </div>
  ),
}));
vi.mock('../components/DayInfoModal', () => ({
  default: ({ existing, onClose }) => (
    <div data-testid="dayinfo-modal" data-existing-id={existing?.id ?? ''}>
      <button onClick={onClose}>modal-close</button>
    </div>
  ),
}));
vi.mock('../components/MealModal', () => ({
  default: ({ logId, existing, onClose }) => (
    <div data-testid="meal-modal"
         data-log-id={logId}
         data-existing-id={existing?.id ?? ''}>
      <button onClick={onClose}>modal-close</button>
    </div>
  ),
}));

vi.mock('../api', () => ({ default: { delete: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

vi.mock('../hooks/useWeightLog',   () => ({ default: vi.fn() }));
vi.mock('../hooks/useNutrition',   () => ({ default: vi.fn() }));
vi.mock('../hooks/useWorkouts',    () => ({ default: vi.fn() }));
vi.mock('../hooks/useSteps',       () => ({ default: vi.fn() }));
vi.mock('../hooks/useUserProfile', () => ({ default: vi.fn() }));
vi.mock('../hooks/useTemplates',   () => ({ default: vi.fn() }));
vi.mock('../hooks/usePRs',         () => ({ default: vi.fn() }));

import api from '../api';
import useWeightLog   from '../hooks/useWeightLog';
import useNutrition   from '../hooks/useNutrition';
import useWorkouts    from '../hooks/useWorkouts';
import useSteps       from '../hooks/useSteps';
import useUserProfile from '../hooks/useUserProfile';
import useTemplates   from '../hooks/useTemplates';
import usePRs         from '../hooks/usePRs';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TODAY = '2026-04-10';

const WEIGHT_ENTRY    = { id: 1, logDate: TODAY, weightLbs: 185 };
const WORKOUT_ENTRY   = {
  id: 10, sessionDate: TODAY, sessionName: 'Push',
  exerciseSets: [
    { id: 1, exerciseName: 'Bench Press', setNumber: 1, reps: 8,  weightLbs: 135 },
    { id: 2, exerciseName: 'Bench Press', setNumber: 2, reps: 6,  weightLbs: 135 },
    { id: 3, exerciseName: 'OHP',         setNumber: 1, reps: 10, weightLbs: 95  },
  ],
};
const NUTRITION_ENTRY = {
  id: 5, logDate: TODAY, dayType: 'training', steps: 8000,
  totalCalories: 1800, totalProtein: 120,
  meals: [
    { id: 11, mealName: 'Breakfast', calories: 600,  proteinGrams: 40 },
    { id: 12, mealName: 'Lunch',     calories: 1200, proteinGrams: 80 },
  ],
};
const DEFAULT_GOALS = { calorieTargetTraining: 2600, calorieTargetRest: 2000, proteinTarget: 180 };

// ── Test helpers ──────────────────────────────────────────────────────────────

function setup({
  weight    = [],
  nutrition = [],
  workouts  = [],
  steps     = [],
  prs       = [],
  templates = [],
  goals     = DEFAULT_GOALS,
} = {}) {
  const refetchWeight    = vi.fn();
  const refetchNutrition = vi.fn();
  const refetchWorkouts  = vi.fn();
  const refetchSteps     = vi.fn();
  const refetchPRs       = vi.fn();

  useWeightLog.mockReturnValue({ data: weight,    refetch: refetchWeight });
  useNutrition.mockReturnValue({ data: nutrition, refetch: refetchNutrition });
  useWorkouts.mockReturnValue({  data: workouts,  refetch: refetchWorkouts });
  useSteps.mockReturnValue({     data: steps,     refetch: refetchSteps });
  useUserProfile.mockReturnValue({ goals, loading: false });
  useTemplates.mockReturnValue({ data: templates });
  usePRs.mockReturnValue({ data: prs, refetch: refetchPRs });

  return { refetchWeight, refetchNutrition, refetchWorkouts, refetchSteps, refetchPRs };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── DISPLAY: empty states ─────────────────────────────────────────────────────

describe('Today — empty states', () => {
  it('shows "No entry for today" in all three sections when nothing logged', () => {
    setup();
    render(<Today />);
    // All three sections (weight, workout, nutrition) each show this span
    const empties = screen.getAllByText(/no entry for today/i);
    expect(empties).toHaveLength(3);
  });

  it('shows + Add buttons for daily logs and Start Workout when nothing logged', () => {
    setup();
    render(<Today />);
    // Two "+ Add" buttons: weight section and steps section
    const addBtns = screen.getAllByRole('button', { name: /^\+ Add$/i });
    expect(addBtns).toHaveLength(2);
    expect(screen.getByRole('button', { name: /start workout/i })).toBeInTheDocument();
  });

  it('does NOT show Edit or Delete weight buttons when no weight entry', () => {
    setup();
    render(<Today />);
    expect(screen.queryByRole('button', { name: /^Edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Delete$/i })).not.toBeInTheDocument();
  });

  it('shows "No entry for today" in workout section when no workout logged', () => {
    setup();
    render(<Today />);
    const empties = screen.getAllByText(/no entry for today/i);
    expect(empties.length).toBeGreaterThanOrEqual(2);
  });

  it('shows "No entry for today" in nutrition section when no nutrition logged', () => {
    setup();
    render(<Today />);
    const empties = screen.getAllByText(/no entry for today/i);
    expect(empties.length).toBeGreaterThanOrEqual(3);
  });
});

// ── DISPLAY: weight section ───────────────────────────────────────────────────

describe('Today — weight display', () => {
  it('shows the logged weight value in lbs', () => {
    setup({ weight: [WEIGHT_ENTRY] });
    render(<Today />);
    expect(screen.getByText('185 lbs')).toBeInTheDocument();
  });

  it('shows Edit and Delete buttons when a weight entry exists', () => {
    setup({ weight: [WEIGHT_ENTRY] });
    render(<Today />);
    expect(screen.getByRole('button', { name: /^Edit$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Delete$/i })).toBeInTheDocument();
  });

  it('does NOT show + Add in weight section when weight already logged today', () => {
    setup({ weight: [WEIGHT_ENTRY] });
    render(<Today />);
    // Weight section's + Add is gone; steps section still has one
    const addBtns = screen.getAllByRole('button', { name: /^\+ Add$/i });
    expect(addBtns).toHaveLength(1);
  });

  it('ignores weight entries from other dates', () => {
    setup({ weight: [{ id: 99, logDate: '2025-01-01', weightLbs: 200 }] });
    render(<Today />);
    expect(screen.queryByText('200 lbs')).not.toBeInTheDocument();
    // All three sections show "No entry for today" since the old entry is filtered out
    const empties = screen.getAllByText(/no entry for today/i);
    expect(empties.length).toBeGreaterThanOrEqual(3);
  });
});

// ── DISPLAY: workout / exercise section ───────────────────────────────────────

describe('Today — workout display', () => {
  it('shows exercise names when workout has exercises', () => {
    setup({ workouts: [WORKOUT_ENTRY] });
    render(<Today />);
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('OHP')).toBeInTheDocument();
  });

  it('shows exercise weight in the exercise card', () => {
    setup({ workouts: [WORKOUT_ENTRY] });
    render(<Today />);
    // 135 lbs should appear for Bench Press
    expect(screen.getAllByText(/135 lbs/i).length).toBeGreaterThan(0);
  });

  it('shows individual set reps in the exercise card', () => {
    setup({ workouts: [WORKOUT_ENTRY] });
    render(<Today />);
    // Bench Press has reps 8 and 6
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('shows session name in the workout header', () => {
    setup({ workouts: [WORKOUT_ENTRY] });
    render(<Today />);
    expect(screen.getByText('Push')).toBeInTheDocument();
  });

  it('shows "Session logged. No exercises yet." when session exists but has no sets', () => {
    const emptySession = { id: 20, sessionDate: TODAY, sessionName: null, exerciseSets: [] };
    setup({ workouts: [emptySession] });
    render(<Today />);
    expect(screen.getByText(/session logged/i)).toBeInTheDocument();
  });

  it('shows Edit button for each exercise', () => {
    setup({ workouts: [WORKOUT_ENTRY] });
    render(<Today />);
    // Two distinct exercises → two Edit buttons
    const editButtons = screen.getAllByRole('button', { name: /^Edit$/i });
    expect(editButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('shows a PR badge when today ties the all-time PR tuple', () => {
    const singleExercise = {
      id: 10, sessionDate: TODAY, sessionName: 'Push',
      exerciseSets: [{ id: 1, exerciseName: 'Bench Press', setNumber: 1, reps: 8, weightLbs: 135 }],
    };
    const prs = [{ exerciseName: 'Bench Press', maxWeightLbs: '135', setCount: 1, maxRepsInSet: 8, achievedDate: TODAY }];
    setup({ workouts: [singleExercise], prs });
    render(<Today />);
    expect(screen.getByText('PR')).toBeInTheDocument();
  });

  it('does NOT show a PR badge when weight is below the all-time PR', () => {
    const prs = [
      { exerciseName: 'Bench Press', maxWeightLbs: '200', setCount: 3, maxRepsInSet: 5, achievedDate: '2025-01-01' },
      { exerciseName: 'OHP',         maxWeightLbs: '150', setCount: 3, maxRepsInSet: 5, achievedDate: '2025-01-01' },
    ];
    setup({ workouts: [WORKOUT_ENTRY], prs });
    render(<Today />);
    expect(screen.queryByText('PR')).not.toBeInTheDocument();
  });

  it('shows a PR badge when same weight but more sets than the all-time PR', () => {
    const singleExercise = {
      id: 10, sessionDate: TODAY, sessionName: 'Push',
      exerciseSets: [
        { id: 1, exerciseName: 'Bench Press', setNumber: 1, reps: 5, weightLbs: 135 },
        { id: 2, exerciseName: 'Bench Press', setNumber: 2, reps: 5, weightLbs: 135 },
        { id: 3, exerciseName: 'Bench Press', setNumber: 3, reps: 5, weightLbs: 135 },
      ],
    };
    // Old PR: same weight, but only 2 sets
    const prs = [{ exerciseName: 'Bench Press', maxWeightLbs: '135', setCount: 2, maxRepsInSet: 5, achievedDate: '2025-01-01' }];
    setup({ workouts: [singleExercise], prs });
    render(<Today />);
    expect(screen.getByText('PR')).toBeInTheDocument();
  });

  it('shows a PR badge when same weight + sets but higher max reps in any set', () => {
    const singleExercise = {
      id: 10, sessionDate: TODAY, sessionName: 'Push',
      exerciseSets: [
        { id: 1, exerciseName: 'Bench Press', setNumber: 1, reps: 10, weightLbs: 135 }, // 10 max
        { id: 2, exerciseName: 'Bench Press', setNumber: 2, reps: 3,  weightLbs: 135 },
      ],
    };
    // Old PR: same weight, same set count, but max reps in any single set was 5
    const prs = [{ exerciseName: 'Bench Press', maxWeightLbs: '135', setCount: 2, maxRepsInSet: 5, achievedDate: '2025-01-01' }];
    setup({ workouts: [singleExercise], prs });
    render(<Today />);
    expect(screen.getByText('PR')).toBeInTheDocument();
  });

  it('does NOT show a PR badge when same weight but fewer sets than the all-time PR', () => {
    const singleExercise = {
      id: 10, sessionDate: TODAY, sessionName: 'Push',
      exerciseSets: [{ id: 1, exerciseName: 'Bench Press', setNumber: 1, reps: 8, weightLbs: 135 }],
    };
    const prs = [{ exerciseName: 'Bench Press', maxWeightLbs: '135', setCount: 3, maxRepsInSet: 5, achievedDate: '2025-01-01' }];
    setup({ workouts: [singleExercise], prs });
    render(<Today />);
    expect(screen.queryByText('PR')).not.toBeInTheDocument();
  });

  it('does NOT show a PR badge when same weight + sets but lower max reps in any set', () => {
    const singleExercise = {
      id: 10, sessionDate: TODAY, sessionName: 'Push',
      exerciseSets: [
        { id: 1, exerciseName: 'Bench Press', setNumber: 1, reps: 4, weightLbs: 135 },
        { id: 2, exerciseName: 'Bench Press', setNumber: 2, reps: 4, weightLbs: 135 },
      ],
    };
    const prs = [{ exerciseName: 'Bench Press', maxWeightLbs: '135', setCount: 2, maxRepsInSet: 6, achievedDate: '2025-01-01' }];
    setup({ workouts: [singleExercise], prs });
    render(<Today />);
    expect(screen.queryByText('PR')).not.toBeInTheDocument();
  });
});

// ── DISPLAY: nutrition section ────────────────────────────────────────────────

describe('Today — nutrition display', () => {
  it('shows meal names when meals are logged', () => {
    setup({ nutrition: [NUTRITION_ENTRY] });
    render(<Today />);
    expect(screen.getByText('Breakfast')).toBeInTheDocument();
    expect(screen.getByText('Lunch')).toBeInTheDocument();
  });

  it('shows calories and protein for each meal card', () => {
    setup({ nutrition: [NUTRITION_ENTRY] });
    render(<Today />);
    // getAllByText handles cases where parent containers also contain this text
    expect(screen.getAllByText(/600 kcal/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/40g protein/i).length).toBeGreaterThan(0);
  });

  it('shows calorie totals vs target', () => {
    setup({ nutrition: [NUTRITION_ENTRY] });
    render(<Today />);
    // 1800 eaten, 2600 target → "1800 / 2600 kcal"
    expect(screen.getByText(/1800 \/ 2600 kcal/i)).toBeInTheDocument();
  });

  it('shows "remaining" when under calorie target', () => {
    setup({ nutrition: [NUTRITION_ENTRY] });
    render(<Today />);
    expect(screen.getByText(/800 remaining/i)).toBeInTheDocument(); // 2600 - 1800
  });

  it('shows "over" when calorie target is exceeded', () => {
    const over = { ...NUTRITION_ENTRY, totalCalories: 3000, totalProtein: 200 };
    setup({ nutrition: [over] });
    render(<Today />);
    expect(screen.getByText(/\+400 over/i)).toBeInTheDocument(); // 3000 - 2600
  });

  it('shows protein remaining vs target', () => {
    setup({ nutrition: [NUTRITION_ENTRY] });
    render(<Today />);
    // 120g eaten, 180g target → 60g remaining
    expect(screen.getByText(/60g remaining/i)).toBeInTheDocument();
  });

  it('shows day type toggle button', () => {
    setup({ nutrition: [NUTRITION_ENTRY] });
    render(<Today />);
    expect(screen.getByRole('button', { name: /training/i })).toBeInTheDocument();
  });

  it('shows "No meals logged yet." when day info exists but no meals', () => {
    const noMeals = { ...NUTRITION_ENTRY, meals: [], totalCalories: 0, totalProtein: 0 };
    setup({ nutrition: [noMeals] });
    render(<Today />);
    expect(screen.getByText(/no meals logged yet/i)).toBeInTheDocument();
  });
});

// ── OPENS: clicking add/edit buttons opens the right modal ────────────────────

describe('Today — opening modals', () => {
  it('+ Add weight button opens WeightModal', async () => {
    setup();
    render(<Today />);
    // First + Add button is in the weight section (weight section comes before workout)
    const addBtns = screen.getAllByRole('button', { name: /^\+ Add$/i });
    await userEvent.click(addBtns[0]);
    expect(screen.getByTestId('weight-modal')).toBeInTheDocument();
  });

  it('Edit weight button opens WeightModal with the existing entry', async () => {
    setup({ weight: [WEIGHT_ENTRY] });
    render(<Today />);
    await userEvent.click(screen.getByRole('button', { name: /^Edit$/i }));
    const modal = screen.getByTestId('weight-modal');
    expect(modal).toBeInTheDocument();
    expect(modal.dataset.existingId).toBe('1');
  });

  it('Start Workout button opens WorkoutBuilderModal for a new session', async () => {
    setup({ weight: [WEIGHT_ENTRY] });
    render(<Today />);
    await userEvent.click(screen.getByRole('button', { name: /start workout/i }));
    const modal = screen.getByTestId('workout-modal');
    expect(modal).toBeInTheDocument();
    expect(modal.dataset.existingSessionId).toBe('');
  });

  it('Edit Workout opens WorkoutBuilderModal for the existing session', async () => {
    setup({ workouts: [WORKOUT_ENTRY] });
    render(<Today />);
    await userEvent.click(screen.getByRole('button', { name: /edit workout/i }));
    const modal = screen.getByTestId('workout-modal');
    expect(modal).toBeInTheDocument();
    expect(modal.dataset.existingSessionId).toBe('10');
    expect(modal.dataset.appendBlank).toBe('false');
  });

  it('+ Exercise opens the existing workout with a blank exercise appended', async () => {
    setup({ workouts: [WORKOUT_ENTRY] });
    render(<Today />);
    await userEvent.click(screen.getByRole('button', { name: /^\+ Exercise$/i }));
    const modal = screen.getByTestId('workout-modal');
    expect(modal).toBeInTheDocument();
    expect(modal.dataset.existingSessionId).toBe('10');
    expect(modal.dataset.appendBlank).toBe('true');
  });

  it('exercise Edit button opens EditExerciseModal with correct exercise name', async () => {
    setup({ workouts: [WORKOUT_ENTRY] });
    render(<Today />);
    // Click the Edit button next to "Bench Press"
    const editButtons = screen.getAllByRole('button', { name: /^Edit$/i });
    await userEvent.click(editButtons[0]);
    const modal = screen.getByTestId('edit-exercise-modal');
    expect(modal).toBeInTheDocument();
    expect(modal.dataset.name).toBe('Bench Press');
    expect(modal.dataset.session).toBe('10');
  });

  it('Edit Day opens DayInfoModal with the existing nutrition entry', async () => {
    setup({ nutrition: [NUTRITION_ENTRY] });
    render(<Today />);
    await userEvent.click(screen.getByRole('button', { name: /edit day/i }));
    const modal = screen.getByTestId('dayinfo-modal');
    expect(modal).toBeInTheDocument();
    expect(modal.dataset.existingId).toBe('5');
  });

  it('+ Add Meal opens MealModal when a nutrition log already exists', async () => {
    setup({ nutrition: [NUTRITION_ENTRY] });
    render(<Today />);
    await userEvent.click(screen.getByRole('button', { name: /\+ add meal/i }));
    const modal = screen.getByTestId('meal-modal');
    expect(modal).toBeInTheDocument();
    expect(modal.dataset.logId).toBe('5');
  });

  it('+ Add Meal creates a nutrition day log first when none exists', async () => {
    api.post.mockResolvedValue({ data: { id: 99 } });
    setup();
    render(<Today />);
    await userEvent.click(screen.getByRole('button', { name: /\+ add meal/i }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/nutrition', expect.objectContaining({ logDate: TODAY }));
    });
    await waitFor(() => expect(screen.getByTestId('meal-modal')).toBeInTheDocument());
    expect(screen.getByTestId('meal-modal').dataset.logId).toBe('99');
  });

  it('meal Edit button opens MealModal with the meal pre-filled', async () => {
    setup({ nutrition: [NUTRITION_ENTRY] });
    render(<Today />);
    const editButtons = screen.getAllByRole('button', { name: /^Edit$/i });
    // Exercise edit buttons come before meal edit buttons; get the last two (meals)
    const mealEditBtn = editButtons[editButtons.length - 1];
    await userEvent.click(mealEditBtn);
    const modal = screen.getByTestId('meal-modal');
    expect(modal).toBeInTheDocument();
    expect(modal.dataset.existingId).toBe('12'); // Lunch is the last meal
  });

  it('closing a modal removes it from the page', async () => {
    setup();
    render(<Today />);
    // Click the first + Add (weight section) to open WeightModal
    const addBtns = screen.getAllByRole('button', { name: /^\+ Add$/i });
    await userEvent.click(addBtns[0]);
    expect(screen.getByTestId('weight-modal')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /modal-close/i }));
    expect(screen.queryByTestId('weight-modal')).not.toBeInTheDocument();
  });
});

// ── ACTION: delete and rename call the API and trigger refetch ────────────────

describe('Today — delete actions', () => {
  it('Delete weight calls DELETE /weight/{id} and refetches weight', async () => {
    api.delete.mockResolvedValue({});
    const { refetchWeight } = setup({ weight: [WEIGHT_ENTRY] });
    render(<Today />);

    await userEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirm delete/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/weight/1');
      expect(refetchWeight).toHaveBeenCalledTimes(1);
    });
  });

  it('Delete session calls DELETE /workouts/{id} and refetches workouts', async () => {
    api.delete.mockResolvedValue({});
    const { refetchWorkouts } = setup({ workouts: [WORKOUT_ENTRY] });
    render(<Today />);

    // The workout section has a Delete button for the session
    const deleteBtns = screen.getAllByRole('button', { name: /^Delete$/i });
    await userEvent.click(deleteBtns[0]);
    await userEvent.click(screen.getByRole('button', { name: /confirm delete/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/workouts/10');
      expect(refetchWorkouts).toHaveBeenCalledTimes(1);
    });
  });

  it('Delete day calls DELETE /nutrition/{id} and refetches nutrition', async () => {
    api.delete.mockResolvedValue({});
    const STEP_ENTRY = { id: 20, logDate: TODAY, steps: 8000 };
    const { refetchNutrition } = setup({ nutrition: [NUTRITION_ENTRY], steps: [STEP_ENTRY] });
    render(<Today />);

    // Steps section also has a Delete button (step entry exists);
    // the nutrition section's Delete is the second one
    const deleteBtns = screen.getAllByRole('button', { name: /^Delete$/i });
    await userEvent.click(deleteBtns[1]);
    await userEvent.click(screen.getByRole('button', { name: /confirm delete/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/nutrition/5');
      expect(refetchNutrition).toHaveBeenCalledTimes(1);
    });
  });

  it('day-type toggle switches from training to rest and refetches', async () => {
    api.post.mockResolvedValue({});
    const { refetchNutrition } = setup({ nutrition: [NUTRITION_ENTRY] });
    render(<Today />);

    await userEvent.click(screen.getByRole('button', { name: /training/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/nutrition', expect.objectContaining({
        logDate: TODAY,
        dayType: 'rest',
      }));
      expect(refetchNutrition).toHaveBeenCalledTimes(1);
    });
  });
});

// ── ACTION: rename session ────────────────────────────────────────────────────

describe('Today — rename workout session', () => {
  it('Rename button shows a text input and save/cancel', async () => {
    setup({ workouts: [WORKOUT_ENTRY] });
    render(<Today />);
    await userEvent.click(screen.getByRole('button', { name: /rename/i }));
    expect(screen.getByPlaceholderText(/session name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Save$/i })).toBeInTheDocument();
  });

  it('× cancel button hides the rename input', async () => {
    setup({ workouts: [WORKOUT_ENTRY] });
    render(<Today />);
    await userEvent.click(screen.getByRole('button', { name: /rename/i }));
    await userEvent.click(screen.getByRole('button', { name: /×/ }));
    expect(screen.queryByPlaceholderText(/session name/i)).not.toBeInTheDocument();
  });

  it('Save calls PATCH /workouts/{id}/name with the new name', async () => {
    api.patch.mockResolvedValue({});
    const { refetchWorkouts } = setup({ workouts: [WORKOUT_ENTRY] });
    render(<Today />);

    await userEvent.click(screen.getByRole('button', { name: /rename/i }));
    const input = screen.getByPlaceholderText(/session name/i);
    await userEvent.clear(input);
    await userEvent.type(input, 'Chest Day');
    await userEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/workouts/10/name', { sessionName: 'Chest Day' });
      expect(refetchWorkouts).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByPlaceholderText(/session name/i)).not.toBeInTheDocument();
  });
});
