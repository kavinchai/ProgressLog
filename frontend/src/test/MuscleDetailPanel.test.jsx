import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MuscleDetailPanel from '../components/MuscleDetailPanel';

vi.mock('../components/MuscleDetailPanel.css', () => ({}));

describe('MuscleDetailPanel', () => {
  it('renders nothing when no muscle is selected', () => {
    const { container } = render(<MuscleDetailPanel muscle={null} exercises={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the muscle group name as a title', () => {
    render(<MuscleDetailPanel muscle="chest" exercises={[]} />);
    expect(screen.getByText(/chest/i)).toBeInTheDocument();
  });

  it('shows "no exercises" message when muscle has no exercises', () => {
    render(<MuscleDetailPanel muscle="chest" exercises={[]} />);
    expect(screen.getByText(/no exercises/i)).toBeInTheDocument();
  });

  it('lists exercise names when exercises exist', () => {
    const exercises = [
      { name: 'Bench Press', sets: [
        { exerciseName: 'Bench Press', weightLbs: '135', reps: 8, setNumber: 1 },
        { exerciseName: 'Bench Press', weightLbs: '135', reps: 8, setNumber: 2 },
      ]},
    ];
    render(<MuscleDetailPanel muscle="chest" exercises={exercises} />);
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
  });

  it('shows set details for each exercise', () => {
    const exercises = [
      { name: 'Bench Press', sets: [
        { exerciseName: 'Bench Press', weightLbs: '135', reps: 8, setNumber: 1 },
      ]},
    ];
    render(<MuscleDetailPanel muscle="chest" exercises={exercises} />);
    expect(screen.getByText(/135/)).toBeInTheDocument();
    expect(screen.getByText(/8/)).toBeInTheDocument();
  });

  it('lists multiple exercises', () => {
    const exercises = [
      { name: 'Bench Press', sets: [{ exerciseName: 'Bench Press', weightLbs: '135', reps: 8, setNumber: 1 }]},
      { name: 'Dumbbell Fly', sets: [{ exerciseName: 'Dumbbell Fly', weightLbs: '30', reps: 12, setNumber: 1 }]},
    ];
    render(<MuscleDetailPanel muscle="chest" exercises={exercises} />);
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('Dumbbell Fly')).toBeInTheDocument();
  });
});
