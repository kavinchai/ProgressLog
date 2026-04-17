import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkoutBuilderModal from '../components/WorkoutBuilderModal';

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../components/WorkoutBuilderModal.css', () => ({}));
vi.mock('../components/Modal.css', () => ({}));

import api from '../api';

const onClose = vi.fn();
const onSaved = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation((url) => {
    if (url === '/workouts/exercise-names') return Promise.resolve({ data: ['Bench Press', 'Squat', 'Deadlift'] });
    if (url === '/templates') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });
});

describe('WorkoutBuilderModal — rendering', () => {
  it('renders "Log Workout" title', () => {
    render(<WorkoutBuilderModal onClose={onClose} onSaved={onSaved} />);
    expect(screen.getByText(/Log Workout/)).toBeInTheDocument();
  });

  it('pre-fills date from prefillDate prop', () => {
    render(<WorkoutBuilderModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);
    expect(screen.getByDisplayValue('2026-01-05')).toBeInTheDocument();
  });

  it('renders Session Name field', () => {
    render(<WorkoutBuilderModal onClose={onClose} onSaved={onSaved} />);
    expect(screen.getByPlaceholderText(/push, pull, legs/i)).toBeInTheDocument();
  });

  it('Cancel button calls onClose', async () => {
    render(<WorkoutBuilderModal onClose={onClose} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('WorkoutBuilderModal — exercise management', () => {
  it('[+ add exercise] button adds an exercise name input', async () => {
    render(<WorkoutBuilderModal onClose={onClose} onSaved={onSaved} />);
    expect(screen.queryByPlaceholderText(/exercise name/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /\+ exercise/i }));
    expect(screen.getByPlaceholderText(/exercise name/i)).toBeInTheDocument();
  });

  it('each new exercise starts with one empty set row', async () => {
    render(<WorkoutBuilderModal onClose={onClose} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: /\+ exercise/i }));

    // One weight input and one reps input — both empty
    const placeholders = screen.getAllByPlaceholderText('0');
    expect(placeholders).toHaveLength(2); // weight + reps for set 1
    expect(placeholders[0].value).toBe('');
    expect(placeholders[1].value).toBe('');
  });

  it('[x] next to exercise removes the entire exercise block', async () => {
    render(<WorkoutBuilderModal onClose={onClose} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: /\+ exercise/i }));
    expect(screen.getByPlaceholderText(/exercise name/i)).toBeInTheDocument();

    // Two [x] buttons exist: exercise-level [x] (index 0) and set-level [x] (index 1)
    const xButtons = screen.getAllByRole('button', { name: /×/ });
    await userEvent.click(xButtons[0]); // exercise [x]
    expect(screen.queryByPlaceholderText(/exercise name/i)).not.toBeInTheDocument();
  });

  it('[+ set] adds a second set row to an exercise', async () => {
    render(<WorkoutBuilderModal onClose={onClose} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: /\+ exercise/i }));

    // 1 exercise [x] + 1 set [x] = 2 total
    expect(screen.getAllByRole('button', { name: /×/ })).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: /\+ set/i }));

    // 1 exercise [x] + 2 set [x] = 3 total
    expect(screen.getAllByRole('button', { name: /×/ })).toHaveLength(3);
  });

  it('removing a set leaves the remaining sets renumbered from 1', async () => {
    render(<WorkoutBuilderModal onClose={onClose} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: /\+ exercise/i }));
    await userEvent.click(screen.getByRole('button', { name: /\+ set/i })); // now 2 sets

    // Remove set 1 (the first set [x], which is index 1 after exercise [x])
    const xButtons = screen.getAllByRole('button', { name: /×/ });
    await userEvent.click(xButtons[1]); // remove set 1

    // Only one set remains, and it should be numbered 1
    expect(screen.getAllByRole('button', { name: /×/ })).toHaveLength(2); // exercise + 1 set
    expect(screen.getByText('1')).toBeInTheDocument(); // set number label
  });
});

describe('WorkoutBuilderModal — autocomplete suggestions', () => {
  it('shows suggestions matching the typed exercise name', async () => {
    render(<WorkoutBuilderModal onClose={onClose} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: /\+ exercise/i }));

    // Wait for exercise names to load, then type a partial name
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/workouts/exercise-names'));
    await userEvent.type(screen.getByPlaceholderText(/exercise name/i), 'Bench');

    // Should show "Bench Press" from the mocked list
    await waitFor(() => expect(screen.getByText('Bench Press')).toBeInTheDocument());
  });

  it('clicking a suggestion fills the exercise name field', async () => {
    render(<WorkoutBuilderModal onClose={onClose} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: /\+ exercise/i }));

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/workouts/exercise-names'));
    await userEvent.type(screen.getByPlaceholderText(/exercise name/i), 'Sq');

    await waitFor(() => expect(screen.getByText('Squat')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Squat'));

    expect(screen.getByDisplayValue('Squat')).toBeInTheDocument();
  });

  it('suggestions disappear after selecting one', async () => {
    render(<WorkoutBuilderModal onClose={onClose} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: /\+ exercise/i }));

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/workouts/exercise-names'));
    await userEvent.type(screen.getByPlaceholderText(/exercise name/i), 'Sq');

    await waitFor(() => expect(screen.getByText('Squat')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Squat'));

    // Suggestions should no longer be visible
    expect(screen.queryByText('Deadlift')).not.toBeInTheDocument();
  });

  it('shows no suggestions when input is empty', async () => {
    render(<WorkoutBuilderModal onClose={onClose} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: /\+ exercise/i }));

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/workouts/exercise-names'));
    // Focus the input without typing
    await userEvent.click(screen.getByPlaceholderText(/exercise name/i));

    // None of the known exercises should appear as suggestions
    expect(screen.queryByText('Bench Press')).not.toBeInTheDocument();
    expect(screen.queryByText('Squat')).not.toBeInTheDocument();
  });
});

describe('WorkoutBuilderModal — prefilled from template', () => {
  const prefillExercises = [
    {
      exerciseName: 'Squat',
      sets: [
        { setNumber: 1, reps: 5, weightLbs: 225 },
        { setNumber: 2, reps: 5, weightLbs: 225 },
      ],
    },
  ];

  it('renders prefilled exercise name', () => {
    render(
      <WorkoutBuilderModal
        prefillDate="2026-01-05"
        prefillExercises={prefillExercises}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
    expect(screen.getByDisplayValue('Squat')).toBeInTheDocument();
  });

  it('renders prefilled set values', () => {
    render(
      <WorkoutBuilderModal
        prefillDate="2026-01-05"
        prefillExercises={prefillExercises}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
    expect(screen.getAllByDisplayValue('225')).toHaveLength(2);
    expect(screen.getAllByDisplayValue('5')).toHaveLength(2);
  });
});

describe('WorkoutBuilderModal — form submission', () => {
  it('submits exercise name AND set data (weight + reps) to /workouts', async () => {
    // This test verifies the full payload — a bug that drops set data would fail here.
    api.post.mockResolvedValue({});

    render(<WorkoutBuilderModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);
    await userEvent.type(screen.getByPlaceholderText(/push, pull, legs/i), 'Push');

    await userEvent.click(screen.getByRole('button', { name: /\+ exercise/i }));
    await userEvent.type(screen.getByPlaceholderText(/exercise name/i), 'Bench Press');

    const inputs = screen.getAllByPlaceholderText('0');
    await userEvent.type(inputs[0], '135'); // weight
    await userEvent.type(inputs[1], '8');   // reps

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/workouts', {
        sessionDate: '2026-01-05',
        sessionName: 'Push',
        exercises: [{
          exerciseName: 'Bench Press',
          sets: [{ setNumber: 1, reps: 8, weightLbs: 135 }],
        }],
      });
    });
  });

  it('submits multiple exercises each with their own sets', async () => {
    api.post.mockResolvedValue({});

    render(<WorkoutBuilderModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);

    // Add first exercise
    await userEvent.click(screen.getByRole('button', { name: /\+ exercise/i }));
    const exerciseInputs = screen.getAllByPlaceholderText(/exercise name/i);
    await userEvent.type(exerciseInputs[0], 'Bench Press');
    let inputs = screen.getAllByPlaceholderText('0');
    await userEvent.type(inputs[0], '135');
    await userEvent.type(inputs[1], '8');

    // Add second exercise
    await userEvent.click(screen.getByRole('button', { name: /\+ exercise/i }));
    const exerciseInputs2 = screen.getAllByPlaceholderText(/exercise name/i);
    await userEvent.type(exerciseInputs2[1], 'Squat');
    inputs = screen.getAllByPlaceholderText('0');
    await userEvent.type(inputs[2], '225'); // second exercise weight
    await userEvent.type(inputs[3], '5');   // second exercise reps

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/workouts', {
        sessionDate: '2026-01-05',
        sessionName: null, // empty session name is coerced to null by the component
        exercises: [
          {
            exerciseName: 'Bench Press',
            sets: [{ setNumber: 1, reps: 8, weightLbs: 135 }],
          },
          {
            exerciseName: 'Squat',
            sets: [{ setNumber: 1, reps: 5, weightLbs: 225 }],
          },
        ],
      });
    });
  });

  it('submits multiple sets for one exercise with correct set numbers', async () => {
    api.post.mockResolvedValue({});

    render(<WorkoutBuilderModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);

    await userEvent.click(screen.getByRole('button', { name: /\+ exercise/i }));
    await userEvent.type(screen.getByPlaceholderText(/exercise name/i), 'Deadlift');

    // Set 1
    let inputs = screen.getAllByPlaceholderText('0');
    await userEvent.type(inputs[0], '315');
    await userEvent.type(inputs[1], '5');

    // Add set 2
    await userEvent.click(screen.getByRole('button', { name: /\+ set/i }));
    inputs = screen.getAllByPlaceholderText('0');
    await userEvent.type(inputs[2], '335');
    await userEvent.type(inputs[3], '3');

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/workouts', {
        sessionDate: '2026-01-05',
        sessionName: null, // empty session name is coerced to null
        exercises: [{
          exerciseName: 'Deadlift',
          sets: [
            { setNumber: 1, reps: 5, weightLbs: 315 },
            { setNumber: 2, reps: 3, weightLbs: 335 },
          ],
        }],
      });
    });
  });

  it('submit with no exercises sends empty exercises array', async () => {
    api.post.mockResolvedValue({});

    render(<WorkoutBuilderModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/workouts', expect.objectContaining({
        exercises: [],
      }));
    });
  });

  it('filters out exercises with empty names from the payload', async () => {
    api.post.mockResolvedValue({});

    render(<WorkoutBuilderModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: /\+ exercise/i }));
    // Leave exercise name empty and submit
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/workouts', expect.objectContaining({
        exercises: [],
      }));
    });
  });

  it('calls onSaved and onClose after a successful submit', async () => {
    api.post.mockResolvedValue({});

    render(<WorkoutBuilderModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('shows error on failed submit', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Validation error' } } });

    render(<WorkoutBuilderModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(screen.getByText(/validation error/i)).toBeInTheDocument());
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('shows fallback error message when response has no message', async () => {
    api.post.mockRejectedValue({});

    render(<WorkoutBuilderModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(screen.getByText(/failed to save/i)).toBeInTheDocument());
  });
});
