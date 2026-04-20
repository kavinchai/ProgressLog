/**
 * User-experience integration tests.
 *
 * These tests simulate realistic multi-step user flows — adding data via modals
 * and verifying it displays correctly on the Today page.  Modals are NOT stubbed
 * here (unlike Today.test.jsx which stubs them) so we exercise the real form
 * components and API calls end-to-end.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── CSS mocks ────────────────────────────────────────────────────────────────
vi.mock('../pages/Today.css', () => ({}));
vi.mock('../components/WorkoutBuilderModal.css', () => ({}));
vi.mock('../components/Modal.css', () => ({}));

// Fix date
vi.mock('../utils/date', () => ({
  localDateStr:   () => '2026-04-10',
  formatDateFull: () => '4/10/2026',
}));

// Mock API — all calls go through this
vi.mock('../api', () => ({
  default: {
    get:    vi.fn(),
    post:   vi.fn(),
    put:    vi.fn(),
    patch:  vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../hooks/useWeightLog',   () => ({ default: vi.fn() }));
vi.mock('../hooks/useNutrition',   () => ({ default: vi.fn() }));
vi.mock('../hooks/useWorkouts',    () => ({ default: vi.fn() }));
vi.mock('../hooks/useUserProfile', () => ({ default: vi.fn() }));
vi.mock('../hooks/useTemplates',   () => ({ default: vi.fn() }));
vi.mock('../hooks/usePRs',         () => ({ default: vi.fn() }));

import api from '../api';
import useWeightLog   from '../hooks/useWeightLog';
import useNutrition   from '../hooks/useNutrition';
import useWorkouts    from '../hooks/useWorkouts';
import useUserProfile from '../hooks/useUserProfile';
import useTemplates   from '../hooks/useTemplates';
import usePRs         from '../hooks/usePRs';

import Today from '../pages/Today';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const TODAY = '2026-04-10';
const DEFAULT_GOALS = {
  calorieTargetTraining: 2600,
  calorieTargetRest: 2000,
  proteinTarget: 180,
};

function setup({
  weight    = [],
  nutrition = [],
  workouts  = [],
  prs       = [],
  templates = [],
  goals     = DEFAULT_GOALS,
} = {}) {
  const refetchWeight    = vi.fn();
  const refetchNutrition = vi.fn();
  const refetchWorkouts  = vi.fn();
  const refetchPRs       = vi.fn();

  useWeightLog.mockReturnValue({ data: weight,    refetch: refetchWeight });
  useNutrition.mockReturnValue({ data: nutrition, refetch: refetchNutrition });
  useWorkouts.mockReturnValue({  data: workouts,  refetch: refetchWorkouts });
  useUserProfile.mockReturnValue({ goals, loading: false });
  useTemplates.mockReturnValue({ data: templates });
  usePRs.mockReturnValue({ data: prs, refetch: refetchPRs });

  // Default API stubs
  api.get.mockImplementation((url) => {
    if (url === '/workouts/exercise-names') return Promise.resolve({ data: [] });
    if (url === '/templates') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });

  return { refetchWeight, refetchNutrition, refetchWorkouts, refetchPRs };
}

beforeEach(() => vi.clearAllMocks());

// ── FLOW: Add a lifting exercise and see it on the page ─────────────────────

describe('Flow — add lifting exercise via WorkoutBuilderModal', () => {
  it('opens modal, fills in exercise, saves, and API receives correct payload', async () => {
    api.post.mockResolvedValue({});
    const { refetchWorkouts } = setup();
    render(<Today />);

    // With empty data: Weight + Add (0), Steps + Add (1), Workout + Add (2)
    const addBtns = screen.getAllByRole('button', { name: /^\+ Add$/i });
    await userEvent.click(addBtns[2]);

    // Modal should appear
    expect(screen.getByText(/Log Workout/)).toBeInTheDocument();

    // Fill in session name
    await userEvent.type(screen.getByPlaceholderText(/push, pull, legs/i), 'Push Day');

    // Add an exercise
    await userEvent.click(screen.getByRole('button', { name: /\+ exercise/i }));
    await userEvent.type(screen.getByPlaceholderText(/exercise name/i), 'Bench Press');

    // Fill in weight and reps
    const setInputs = screen.getAllByPlaceholderText('0');
    await userEvent.type(setInputs[0], '135');
    await userEvent.type(setInputs[1], '8');

    // Save
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/workouts', {
        sessionDate: TODAY,
        sessionName: 'Push Day',
        exercises: [{
          exerciseName: 'Bench Press',
          sets: [{ setNumber: 1, reps: 8, weightLbs: 135 }],
        }],
      });
      expect(refetchWorkouts).toHaveBeenCalled();
    });
  });

  it('adding multiple sets sends all sets with correct set numbers', async () => {
    api.post.mockResolvedValue({});
    setup();
    render(<Today />);

    // Empty data: Weight + Add [0], Steps + Add [1], Workout + Add [2]
    const addBtns = screen.getAllByRole('button', { name: /^\+ Add$/i });
    await userEvent.click(addBtns[2]);

    await userEvent.click(screen.getByRole('button', { name: /\+ exercise/i }));
    await userEvent.type(screen.getByPlaceholderText(/exercise name/i), 'Squat');

    // Set 1
    let inputs = screen.getAllByPlaceholderText('0');
    await userEvent.type(inputs[0], '225');
    await userEvent.type(inputs[1], '5');

    // Add set 2
    await userEvent.click(screen.getByRole('button', { name: /\+ set/i }));
    inputs = screen.getAllByPlaceholderText('0');
    await userEvent.type(inputs[2], '245');
    await userEvent.type(inputs[3], '3');

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/workouts', expect.objectContaining({
        exercises: [{
          exerciseName: 'Squat',
          sets: [
            { setNumber: 1, reps: 5, weightLbs: 225 },
            { setNumber: 2, reps: 3, weightLbs: 245 },
          ],
        }],
      }));
    });
  });

  it('adding two different exercises sends both in the payload', async () => {
    api.post.mockResolvedValue({});
    setup();
    render(<Today />);

    const addBtns = screen.getAllByRole('button', { name: /^\+ Add$/i });
    await userEvent.click(addBtns[2]);

    // Exercise 1
    await userEvent.click(screen.getByRole('button', { name: /\+ exercise/i }));
    await userEvent.type(screen.getByPlaceholderText(/exercise name/i), 'Bench Press');
    let inputs = screen.getAllByPlaceholderText('0');
    await userEvent.type(inputs[0], '135');
    await userEvent.type(inputs[1], '8');

    // Exercise 2
    await userEvent.click(screen.getByRole('button', { name: /\+ exercise/i }));
    const nameInputs = screen.getAllByPlaceholderText(/exercise name/i);
    await userEvent.type(nameInputs[1], 'OHP');
    inputs = screen.getAllByPlaceholderText('0');
    await userEvent.type(inputs[2], '95');
    await userEvent.type(inputs[3], '10');

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      const call = api.post.mock.calls.find(c => c[0] === '/workouts');
      expect(call[1].exercises).toHaveLength(2);
      expect(call[1].exercises[0].exerciseName).toBe('Bench Press');
      expect(call[1].exercises[1].exerciseName).toBe('OHP');
    });
  });
});

// ── FLOW: Add a run via WorkoutBuilderModal ──────────────────────────────────

describe('Flow — add run via WorkoutBuilderModal', () => {
  it('+ Run button adds a run with distance/time fields and submits with durationSeconds', async () => {
    api.post.mockResolvedValue({});
    setup();
    render(<Today />);

    const addBtns = screen.getAllByRole('button', { name: /^\+ Add$/i });
    await userEvent.click(addBtns[2]);

    // Click "+ Run"
    await userEvent.click(screen.getByRole('button', { name: /\+ run/i }));

    // Should show run-specific headers
    expect(screen.getByText('Distance (mi)')).toBeInTheDocument();
    expect(screen.getByText('Min')).toBeInTheDocument();
    expect(screen.getByText('Sec')).toBeInTheDocument();

    // Fill in distance and time
    const inputs = screen.getAllByPlaceholderText('0');
    await userEvent.type(inputs[0], '3.1');  // distance
    await userEvent.type(inputs[1], '25');   // minutes
    await userEvent.type(inputs[2], '30');   // seconds

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      const call = api.post.mock.calls.find(c => c[0] === '/workouts');
      expect(call[1].exercises).toHaveLength(1);
      const exercise = call[1].exercises[0];
      expect(exercise.exerciseName).toBe('Run');
      expect(exercise.sets[0].distanceMiles).toBe(3.1);
      expect(exercise.sets[0].durationSeconds).toBe(25 * 60 + 30);
    });
  });

  it('run exercise name defaults to "Run" but can be changed', async () => {
    api.post.mockResolvedValue({});
    setup();
    render(<Today />);

    const addBtns = screen.getAllByRole('button', { name: /^\+ Add$/i });
    await userEvent.click(addBtns[2]);
    await userEvent.click(screen.getByRole('button', { name: /\+ run/i }));

    // Name should default to "Run"
    const nameInput = screen.getByDisplayValue('Run');
    expect(nameInput).toBeInTheDocument();

    // Change it
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Morning Jog');

    const inputs = screen.getAllByPlaceholderText('0');
    await userEvent.type(inputs[0], '2');
    await userEvent.type(inputs[1], '18');
    await userEvent.type(inputs[2], '0');

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      const call = api.post.mock.calls.find(c => c[0] === '/workouts');
      expect(call[1].exercises[0].exerciseName).toBe('Morning Jog');
    });
  });
});

// ── FLOW: Add a timed activity via WorkoutBuilderModal ───────────────────────

describe('Flow — add timed activity via WorkoutBuilderModal', () => {
  it('+ Timed button adds a timed activity with Hr/Min/Sec fields', async () => {
    api.post.mockResolvedValue({});
    setup();
    render(<Today />);

    const addBtns = screen.getAllByRole('button', { name: /^\+ Add$/i });
    await userEvent.click(addBtns[2]);

    await userEvent.click(screen.getByRole('button', { name: /\+ timed/i }));

    // Should show timed-specific headers
    expect(screen.getByText('Hr')).toBeInTheDocument();
    expect(screen.getByText('Min')).toBeInTheDocument();
    expect(screen.getByText('Sec')).toBeInTheDocument();

    // Fill in the exercise name and duration
    await userEvent.type(screen.getByPlaceholderText(/exercise name/i), 'Plank');
    const inputs = screen.getAllByPlaceholderText('0');
    await userEvent.type(inputs[0], '0');  // hours
    await userEvent.type(inputs[1], '2');  // minutes
    await userEvent.type(inputs[2], '30'); // seconds

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      const call = api.post.mock.calls.find(c => c[0] === '/workouts');
      const exercise = call[1].exercises[0];
      expect(exercise.exerciseName).toBe('Plank');
      expect(exercise.sets[0].durationSeconds).toBe(150); // 2*60 + 30
      expect(exercise.sets[0].distanceMiles).toBeUndefined();
    });
  });

  it('toggle button switches a lifting exercise to timed', async () => {
    api.post.mockResolvedValue({});
    setup();
    render(<Today />);

    const addBtns = screen.getAllByRole('button', { name: /^\+ Add$/i });
    await userEvent.click(addBtns[2]);

    // Add a lifting exercise first
    await userEvent.click(screen.getByRole('button', { name: /\+ exercise/i }));
    expect(screen.getByText('Weight (lbs)')).toBeInTheDocument();

    // Toggle to timed
    await userEvent.click(screen.getByRole('button', { name: /lifting/i }));
    expect(screen.getByText('Hr')).toBeInTheDocument();
    expect(screen.queryByText('Weight (lbs)')).not.toBeInTheDocument();
  });
});

// ── DISPLAY: Workout entries appear correctly after being logged ─────────────

describe('Display — workout entry types render correctly', () => {
  it('displays lifting exercise with weight, set numbers, and reps', () => {
    setup({
      workouts: [{
        id: 10, sessionDate: TODAY, sessionName: 'Push',
        exerciseSets: [
          { id: 1, exerciseName: 'Bench Press', setNumber: 1, reps: 8, weightLbs: 135 },
          { id: 2, exerciseName: 'Bench Press', setNumber: 2, reps: 6, weightLbs: 135 },
        ],
      }],
    });
    render(<Today />);

    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getAllByText(/135 lbs/).length).toBeGreaterThan(0);
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('displays run exercise with distance, time, and pace (no weight column)', () => {
    setup({
      workouts: [{
        id: 10, sessionDate: TODAY, sessionName: null,
        exerciseSets: [{
          id: 1, exerciseName: 'Run', setNumber: 1, reps: 0, weightLbs: 0,
          distanceMiles: 3.1, durationSeconds: 1530,
        }],
      }],
    });
    render(<Today />);

    expect(screen.getByText('Run')).toBeInTheDocument();
    expect(screen.getByText('Distance')).toBeInTheDocument();
    expect(screen.getByText('3.1 mi')).toBeInTheDocument();
    expect(screen.getByText('25m 30s')).toBeInTheDocument();
    // Should show pace
    expect(screen.getByText(/\/mi/)).toBeInTheDocument();
    // Should NOT show "0 lbs" for a run
    expect(screen.queryByText('0 lbs')).not.toBeInTheDocument();
  });

  it('displays timed activity with duration only (no distance, no weight)', () => {
    setup({
      workouts: [{
        id: 10, sessionDate: TODAY, sessionName: null,
        exerciseSets: [{
          id: 1, exerciseName: 'Plank', setNumber: 1, reps: 0, weightLbs: 0,
          distanceMiles: null, durationSeconds: 120,
        }],
      }],
    });
    render(<Today />);

    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('2m 0s')).toBeInTheDocument();
    // Should NOT show distance or pace columns
    expect(screen.queryByText('Distance')).not.toBeInTheDocument();
    expect(screen.queryByText('Pace')).not.toBeInTheDocument();
    expect(screen.queryByText('0 lbs')).not.toBeInTheDocument();
  });

  it('displays mixed workout with lifting and run exercises together', () => {
    setup({
      workouts: [{
        id: 10, sessionDate: TODAY, sessionName: 'Full Body',
        exerciseSets: [
          { id: 1, exerciseName: 'Squat', setNumber: 1, reps: 5, weightLbs: 225 },
          { id: 2, exerciseName: 'Run', setNumber: 1, reps: 0, weightLbs: 0, distanceMiles: 1, durationSeconds: 480 },
        ],
      }],
    });
    render(<Today />);

    // Both should be visible
    expect(screen.getByText('Squat')).toBeInTheDocument();
    expect(screen.getByText('Run')).toBeInTheDocument();
    // Squat shows weight
    expect(screen.getAllByText(/225 lbs/).length).toBeGreaterThan(0);
    // Run shows distance
    expect(screen.getByText('1 mi')).toBeInTheDocument();
  });
});

// ── FLOW: Edit an existing exercise ──────────────────────────────────────────

describe('Flow — edit lifting exercise via EditExerciseModal', () => {
  it('opens edit modal, modifies weight, saves correct payload', async () => {
    api.post.mockResolvedValue({});
    setup({
      workouts: [{
        id: 10, sessionDate: TODAY, sessionName: 'Push',
        exerciseSets: [
          { id: 1, exerciseName: 'Bench Press', setNumber: 1, reps: 8, weightLbs: 135 },
        ],
      }],
    });
    render(<Today />);

    // Click "Edit" on the Bench Press exercise card
    const editBtns = screen.getAllByRole('button', { name: /^edit$/i });
    await userEvent.click(editBtns[0]);

    // EditExerciseModal should open with "Edit: Bench Press" title
    expect(screen.getByText(/Edit: Bench Press/)).toBeInTheDocument();

    // Weight should be pre-filled with 135
    const weightInput = screen.getByDisplayValue('135');
    await userEvent.clear(weightInput);
    await userEvent.type(weightInput, '145');

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/workouts/10/exercises', {
        exerciseName: 'Bench Press',
        sets: [{ setNumber: 1, reps: 8, weightLbs: 145 }],
      });
    });
  });

  it('delete exercise sends DELETE and closes modal', async () => {
    api.delete.mockResolvedValue({});
    const { refetchWorkouts } = setup({
      workouts: [{
        id: 10, sessionDate: TODAY, sessionName: 'Push',
        exerciseSets: [
          { id: 1, exerciseName: 'OHP', setNumber: 1, reps: 10, weightLbs: 95 },
        ],
      }],
    });
    render(<Today />);

    const editBtns = screen.getAllByRole('button', { name: /^edit$/i });
    await userEvent.click(editBtns[0]);

    await userEvent.click(screen.getByRole('button', { name: /delete exercise/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/workouts/10/exercises', {
        params: { name: 'OHP' },
      });
      expect(refetchWorkouts).toHaveBeenCalled();
    });
  });
});

describe('Flow — edit run exercise via EditExerciseModal', () => {
  it('opens edit modal for run with distance/time fields pre-filled', async () => {
    api.post.mockResolvedValue({});
    setup({
      workouts: [{
        id: 10, sessionDate: TODAY, sessionName: null,
        exerciseSets: [{
          id: 1, exerciseName: 'Run', setNumber: 1, reps: 0, weightLbs: 0,
          distanceMiles: 3.1, durationSeconds: 1530,
        }],
      }],
    });
    render(<Today />);

    const editBtns = screen.getAllByRole('button', { name: /^edit$/i });
    await userEvent.click(editBtns[0]);

    expect(screen.getByText(/Edit: Run/)).toBeInTheDocument();
    expect(screen.getByText('Distance (mi)')).toBeInTheDocument();
    // Distance should be pre-filled
    expect(screen.getByDisplayValue('3.1')).toBeInTheDocument();
    // Duration: 1530s = 25m 30s
    expect(screen.getByDisplayValue('25')).toBeInTheDocument();
    expect(screen.getByDisplayValue('30')).toBeInTheDocument();
  });

  it('saves edited run with updated distance and time', async () => {
    api.post.mockResolvedValue({});
    setup({
      workouts: [{
        id: 10, sessionDate: TODAY, sessionName: null,
        exerciseSets: [{
          id: 1, exerciseName: 'Run', setNumber: 1, reps: 0, weightLbs: 0,
          distanceMiles: 3.1, durationSeconds: 1530,
        }],
      }],
    });
    render(<Today />);

    const editBtns = screen.getAllByRole('button', { name: /^edit$/i });
    await userEvent.click(editBtns[0]);

    // Update distance
    const distInput = screen.getByDisplayValue('3.1');
    await userEvent.clear(distInput);
    await userEvent.type(distInput, '5');

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/workouts/10/exercises', {
        exerciseName: 'Run',
        sets: [{
          setNumber: 1,
          reps: 0,
          weightLbs: 0,
          distanceMiles: 5,
          durationSeconds: 1530,
        }],
      });
    });
  });
});

describe('Flow — edit timed exercise via EditExerciseModal', () => {
  it('opens edit modal for timed activity with Hr/Min/Sec fields', async () => {
    setup({
      workouts: [{
        id: 10, sessionDate: TODAY, sessionName: null,
        exerciseSets: [{
          id: 1, exerciseName: 'Plank', setNumber: 1, reps: 0, weightLbs: 0,
          distanceMiles: null, durationSeconds: 90,
        }],
      }],
    });
    render(<Today />);

    const editBtns = screen.getAllByRole('button', { name: /^edit$/i });
    await userEvent.click(editBtns[0]);

    expect(screen.getByText(/Edit: Plank/)).toBeInTheDocument();
    expect(screen.getByText('Hr')).toBeInTheDocument();
    // 90s = 0h 1m 30s
    expect(screen.getByDisplayValue('0')).toBeInTheDocument(); // hours
    expect(screen.getByDisplayValue('1')).toBeInTheDocument(); // minutes
    expect(screen.getByDisplayValue('30')).toBeInTheDocument(); // seconds
  });

  it('saves edited timed activity with correct durationSeconds', async () => {
    api.post.mockResolvedValue({});
    setup({
      workouts: [{
        id: 10, sessionDate: TODAY, sessionName: null,
        exerciseSets: [{
          id: 1, exerciseName: 'Plank', setNumber: 1, reps: 0, weightLbs: 0,
          distanceMiles: null, durationSeconds: 90,
        }],
      }],
    });
    render(<Today />);

    const editBtns = screen.getAllByRole('button', { name: /^edit$/i });
    await userEvent.click(editBtns[0]);

    // Change minutes from 1 to 3
    const minInput = screen.getByDisplayValue('1');
    await userEvent.clear(minInput);
    await userEvent.type(minInput, '3');

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/workouts/10/exercises', {
        exerciseName: 'Plank',
        sets: [{
          setNumber: 1,
          reps: 0,
          weightLbs: 0,
          durationSeconds: 210, // 0*3600 + 3*60 + 30
        }],
      });
    });
  });
});

// ── FLOW: Steps CRUD ─────────────────────────────────────────────────────────

describe('Flow — add/edit/delete steps', () => {
  it('clicking + Add opens inline edit, typing and saving calls POST /nutrition', async () => {
    api.post.mockResolvedValue({});
    const { refetchNutrition } = setup();
    render(<Today />);

    // With empty data: Weight + Add [0], Steps + Add [1], Workout + Add [2]
    await userEvent.click(screen.getAllByRole('button', { name: /^\+ Add$/i })[1]);

    // Should show an input for steps
    const stepsInput = screen.getByPlaceholderText(/steps/i);
    await userEvent.type(stepsInput, '10000');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/nutrition', expect.objectContaining({
        logDate: TODAY,
        steps: 10000,
      }));
      expect(refetchNutrition).toHaveBeenCalled();
    });
  });

  it('displays existing steps count with locale formatting', () => {
    setup({
      nutrition: [{
        id: 5, logDate: TODAY, dayType: 'training', steps: 12345,
        totalCalories: 0, totalProtein: 0, meals: [],
      }],
    });
    render(<Today />);

    expect(screen.getByText('12,345')).toBeInTheDocument();
  });

  it('delete steps calls POST /nutrition with steps: null', async () => {
    api.post.mockResolvedValue({});
    const { refetchNutrition } = setup({
      nutrition: [{
        id: 5, logDate: TODAY, dayType: 'training', steps: 8000,
        totalCalories: 0, totalProtein: 0, meals: [],
      }],
    });
    render(<Today />);

    // Steps section has a Delete button when steps exist
    const deleteBtn = screen.getAllByRole('button', { name: /^delete$/i })[0];
    await userEvent.click(deleteBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/nutrition', expect.objectContaining({
        logDate: TODAY,
        steps: null,
      }));
      expect(refetchNutrition).toHaveBeenCalled();
    });
  });
});

// ── FLOW: Weight CRUD ────────────────────────────────────────────────────────

describe('Flow — add/edit weight', () => {
  it('add weight opens modal, submits correct payload', async () => {
    api.post.mockResolvedValue({});
    const { refetchWeight } = setup();
    render(<Today />);

    const addBtns = screen.getAllByRole('button', { name: /^\+ Add$/i });
    await userEvent.click(addBtns[0]); // weight's + Add

    expect(screen.getByText(/Log Weight/)).toBeInTheDocument();

    // Weight input is type="number" with step="0.1" — find by role
    const spinbuttons = screen.getAllByRole('spinbutton');
    const weightInput = spinbuttons[0]; // first number input is weight
    await userEvent.type(weightInput, '185');

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/weight', {
        logDate: TODAY,
        weightLbs: 185,
      });
      expect(refetchWeight).toHaveBeenCalled();
    });
  });

  it('edit weight opens modal with existing value pre-filled', async () => {
    setup({
      weight: [{ id: 1, logDate: TODAY, weightLbs: 185 }],
    });
    render(<Today />);

    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));

    expect(screen.getByText(/Edit Weight/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('185')).toBeInTheDocument();
  });
});

// ── FLOW: Meal CRUD ──────────────────────────────────────────────────────────

describe('Flow — add/edit meal', () => {
  it('+ Add Meal creates nutrition log first if none exists, then opens meal modal', async () => {
    api.post.mockResolvedValue({ data: { id: 77 } });
    setup();
    render(<Today />);

    await userEvent.click(screen.getByRole('button', { name: /\+ add meal/i }));

    // Should first POST to /nutrition to create the day
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/nutrition', expect.objectContaining({
        logDate: TODAY,
        dayType: 'training',
      }));
    });

    // Then the meal modal should appear (check for placeholder in the modal form)
    await waitFor(() => expect(screen.getByPlaceholderText(/optional/i)).toBeInTheDocument());
  });

  it('filling out and saving a meal calls POST /nutrition/{logId}/meals', async () => {
    // First call creates the log, second call creates the meal
    api.post
      .mockResolvedValueOnce({ data: { id: 77 } })  // create nutrition log
      .mockResolvedValueOnce({});                     // create meal

    const { refetchNutrition } = setup();
    render(<Today />);

    await userEvent.click(screen.getByRole('button', { name: /\+ add meal/i }));

    await waitFor(() => expect(screen.getByPlaceholderText(/optional/i)).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText(/optional/i), 'Lunch');
    const spinbuttons = screen.getAllByRole('spinbutton');
    await userEvent.type(spinbuttons[0], '800');
    await userEvent.type(spinbuttons[1], '50');

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/nutrition/77/meals', {
        mealName: 'Lunch',
        calories: 800,
        proteinGrams: 50,
      });
    });
  });

  it('edit meal opens modal pre-filled and saves via PUT', async () => {
    api.put.mockResolvedValue({});
    setup({
      nutrition: [{
        id: 5, logDate: TODAY, dayType: 'training', steps: null,
        totalCalories: 600, totalProtein: 40,
        meals: [{ id: 11, mealName: 'Breakfast', calories: 600, proteinGrams: 40 }],
      }],
    });
    render(<Today />);

    // The meal's Edit button
    const editBtns = screen.getAllByRole('button', { name: /^edit$/i });
    // Last edit button is the meal edit (Edit Day is first, then meal edits)
    await userEvent.click(editBtns[editBtns.length - 1]);

    expect(screen.getByText(/Edit Meal/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Breakfast')).toBeInTheDocument();

    // Change calories
    const calInput = screen.getByDisplayValue('600');
    await userEvent.clear(calInput);
    await userEvent.type(calInput, '700');

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/nutrition/5/meals/11', {
        mealName: 'Breakfast',
        calories: 700,
        proteinGrams: 40,
      });
    });
  });
});

// ── FLOW: Day type toggle ────────────────────────────────────────────────────

describe('Flow — day type toggle', () => {
  it('toggling from training to rest calls POST /nutrition and refetches', async () => {
    api.post.mockResolvedValue({});
    const { refetchNutrition } = setup({
      nutrition: [{
        id: 5, logDate: TODAY, dayType: 'training', steps: null,
        totalCalories: 0, totalProtein: 0, meals: [],
      }],
    });
    render(<Today />);

    await userEvent.click(screen.getByRole('button', { name: /training/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/nutrition', {
        logDate: TODAY,
        dayType: 'rest',
        steps: null,
      });
      expect(refetchNutrition).toHaveBeenCalled();
    });
  });

  it('uses rest calorie target after toggling day type', () => {
    setup({
      nutrition: [{
        id: 5, logDate: TODAY, dayType: 'rest', steps: null,
        totalCalories: 1500, totalProtein: 100,
        meals: [{ id: 11, mealName: 'Lunch', calories: 1500, proteinGrams: 100 }],
      }],
    });
    render(<Today />);

    // Rest target is 2000, eaten is 1500 → 500 remaining
    expect(screen.getByText(/1500 \/ 2000 kcal/)).toBeInTheDocument();
    expect(screen.getByText(/500 remaining/)).toBeInTheDocument();
  });
});

// ── FLOW: Template loading ───────────────────────────────────────────────────

describe('Flow — load template into workout builder', () => {
  it('clicking a template pre-fills exercise name and sets', async () => {
    setup({
      templates: [{
        id: 1,
        name: 'Push Day',
        exercises: [{
          exerciseName: 'Bench Press',
          sets: [{ setNumber: 1, reps: 5, weightLbs: 135 }],
        }],
      }],
    });
    render(<Today />);

    // Open template dropdown
    await userEvent.click(screen.getByRole('button', { name: /template/i }));
    // Select the template
    await userEvent.click(screen.getByText('Push Day'));

    // WorkoutBuilderModal should open with prefilled data
    await waitFor(() => {
      expect(screen.getByText(/Log Workout/)).toBeInTheDocument();
      expect(screen.getByDisplayValue('Bench Press')).toBeInTheDocument();
      expect(screen.getByDisplayValue('135')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    });
  });
});

// ── FLOW: Cancel and error handling ──────────────────────────────────────────

describe('Flow — cancel and error handling', () => {
  it('cancelling workout modal does not call API', async () => {
    setup();
    render(<Today />);

    const addBtns = screen.getAllByRole('button', { name: /^\+ Add$/i });
    await userEvent.click(addBtns[2]);

    await userEvent.click(screen.getByRole('button', { name: /\+ exercise/i }));
    await userEvent.type(screen.getByPlaceholderText(/exercise name/i), 'Squat');

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(api.post).not.toHaveBeenCalledWith('/workouts', expect.anything());
  });

  it('API error during workout save shows error message in modal', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Session date required' } } });
    setup();
    render(<Today />);

    const addBtns = screen.getAllByRole('button', { name: /^\+ Add$/i });
    await userEvent.click(addBtns[2]);
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(screen.getByText(/session date required/i)).toBeInTheDocument();
    });
  });
});
