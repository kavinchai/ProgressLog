import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditExerciseModal from '../components/EditExerciseModal';

vi.mock('../api', () => ({ default: { post: vi.fn(), delete: vi.fn() } }));
vi.mock('../components/WorkoutBuilderModal.css', () => ({}));
vi.mock('../components/Modal.css', () => ({}));

import api from '../api';

const onClose = vi.fn();
const onSaved = vi.fn();

const SESSION_ID = 10;
const EXERCISE_NAME = 'Bench Press';
const EXERCISE_SETS = [
  { id: 1, setNumber: 1, reps: 8, weightLbs: 135 },
  { id: 2, setNumber: 2, reps: 8, weightLbs: 135 },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('EditExerciseModal', () => {
  it('renders exercise name in the title', () => {
    render(
      <EditExerciseModal
        sessionId={SESSION_ID}
        exerciseName={EXERCISE_NAME}
        exerciseSets={EXERCISE_SETS}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
    expect(screen.getByText(/Bench Press/)).toBeInTheDocument();
  });

  it('renders all existing sets', () => {
    render(
      <EditExerciseModal
        sessionId={SESSION_ID}
        exerciseName={EXERCISE_NAME}
        exerciseSets={EXERCISE_SETS}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
    // Two set rows plus the header row = 3 rows, but we can check the set numbers
    expect(screen.getAllByText('1')).not.toHaveLength(0);
    expect(screen.getAllByText('2')).not.toHaveLength(0);
  });

  it('pre-fills weight and reps from existing sets', () => {
    render(
      <EditExerciseModal
        sessionId={SESSION_ID}
        exerciseName={EXERCISE_NAME}
        exerciseSets={EXERCISE_SETS}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
    // Both sets have weight 135 and reps 8
    const weightInputs = screen.getAllByDisplayValue('135');
    expect(weightInputs).toHaveLength(2);
    const repInputs = screen.getAllByDisplayValue('8');
    expect(repInputs).toHaveLength(2);
  });

  it('[+ set] button adds a new set row', async () => {
    render(
      <EditExerciseModal
        sessionId={SESSION_ID}
        exerciseName={EXERCISE_NAME}
        exerciseSets={EXERCISE_SETS}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
    const removeButtons = screen.getAllByRole('button', { name: /×/ });
    expect(removeButtons).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: /\+ set/i }));

    expect(screen.getAllByRole('button', { name: /×/ })).toHaveLength(3);
  });

  it('[x] button removes a set and renumbers remaining sets', async () => {
    render(
      <EditExerciseModal
        sessionId={SESSION_ID}
        exerciseName={EXERCISE_NAME}
        exerciseSets={EXERCISE_SETS}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
    const removeButtons = screen.getAllByRole('button', { name: /×/ });
    await userEvent.click(removeButtons[0]); // remove set 1

    // Only set #1 should remain (renumbered from set #2)
    expect(screen.getAllByRole('button', { name: /×/ })).toHaveLength(1);
  });

  it('Cancel button calls onClose', async () => {
    render(
      <EditExerciseModal
        sessionId={SESSION_ID}
        exerciseName={EXERCISE_NAME}
        exerciseSets={EXERCISE_SETS}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Save submits correct payload to /workouts/{sessionId}/exercises', async () => {
    api.post.mockResolvedValue({});

    render(
      <EditExerciseModal
        sessionId={SESSION_ID}
        exerciseName={EXERCISE_NAME}
        exerciseSets={EXERCISE_SETS}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(`/workouts/${SESSION_ID}/exercises`, {
        exerciseName: EXERCISE_NAME,
        sets: [
          { setNumber: 1, reps: 8, weightLbs: 135 },
          { setNumber: 2, reps: 8, weightLbs: 135 },
        ],
      });
      expect(onSaved).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('Save shows error on failure', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Session not found' } } });

    render(
      <EditExerciseModal
        sessionId={SESSION_ID}
        exerciseName={EXERCISE_NAME}
        exerciseSets={EXERCISE_SETS}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(screen.getByText(/session not found/i)).toBeInTheDocument());
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('[delete exercise] calls DELETE with exercise name as query param', async () => {
    api.delete.mockResolvedValue({});

    render(
      <EditExerciseModal
        sessionId={SESSION_ID}
        exerciseName={EXERCISE_NAME}
        exerciseSets={EXERCISE_SETS}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /delete exercise/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(`/workouts/${SESSION_ID}/exercises`, {
        params: { name: EXERCISE_NAME },
      });
      expect(onSaved).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('[delete exercise] shows error on failure', async () => {
    api.delete.mockRejectedValue({ response: { data: { message: 'Cannot delete' } } });

    render(
      <EditExerciseModal
        sessionId={SESSION_ID}
        exerciseName={EXERCISE_NAME}
        exerciseSets={EXERCISE_SETS}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /delete exercise/i }));

    await waitFor(() => expect(screen.getByText(/cannot delete/i)).toBeInTheDocument());
  });
});
