/**
 * DailyProgressBar — progress tracking tests.
 *
 * Tests the three progress metrics (calories, protein, steps) with:
 *   DISPLAY  — are values and progress bars shown correctly?
 *   CALC     — do percentages calculate correctly?
 *   STATES   — what happens when goals are exceeded or not set?
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DailyProgressBar from '../components/DailyProgressBar';

vi.mock('../components/DailyProgressBar.css', () => ({}));

describe('DailyProgressBar — display', () => {
  it('shows calories label and current/goal values', () => {
    render(
      <DailyProgressBar
        caloriesCurrent={1800}
        caloriesGoal={2600}
        proteinCurrent={120}
        proteinGoal={180}
        stepsCurrent={8000}
        stepsGoal={10000}
      />
    );
    expect(screen.getByText('Calories')).toBeInTheDocument();
    expect(screen.getByText(/1800\/2600 kcal/i)).toBeInTheDocument();
  });

  it('shows protein label and current/goal values', () => {
    render(
      <DailyProgressBar
        caloriesCurrent={1800}
        caloriesGoal={2600}
        proteinCurrent={120}
        proteinGoal={180}
        stepsCurrent={8000}
        stepsGoal={10000}
      />
    );
    expect(screen.getByText('Protein')).toBeInTheDocument();
    expect(screen.getByText(/120\/180 g/i)).toBeInTheDocument();
  });

  it('shows steps label and current/goal values', () => {
    render(
      <DailyProgressBar
        caloriesCurrent={1800}
        caloriesGoal={2600}
        proteinCurrent={120}
        proteinGoal={180}
        stepsCurrent={8000}
        stepsGoal={10000}
      />
    );
    expect(screen.getByText('Steps')).toBeInTheDocument();
    expect(screen.getByText(/8000\/10000 steps/i)).toBeInTheDocument();
  });

  it('renders three progress bars', () => {
    const { container } = render(
      <DailyProgressBar
        caloriesCurrent={1800}
        caloriesGoal={2600}
        proteinCurrent={120}
        proteinGoal={180}
        stepsCurrent={8000}
        stepsGoal={10000}
      />
    );
    const bars = container.querySelectorAll('.daily-progress-bar');
    expect(bars).toHaveLength(3);
  });
});

describe('DailyProgressBar — percentage calculation', () => {
  it('calculates calories as 50% when halfway to goal', () => {
    const { container } = render(
      <DailyProgressBar
        caloriesCurrent={1300}
        caloriesGoal={2600}
        proteinCurrent={0}
        proteinGoal={1}
        stepsCurrent={0}
        stepsGoal={1}
      />
    );
    const calorieBar = container.querySelector('.daily-progress-bar--calories');
    expect(calorieBar).toHaveStyle({ width: '50%' });
  });

  it('calculates protein as 100% when goal reached', () => {
    const { container } = render(
      <DailyProgressBar
        caloriesCurrent={0}
        caloriesGoal={1}
        proteinCurrent={180}
        proteinGoal={180}
        stepsCurrent={0}
        stepsGoal={1}
      />
    );
    const proteinBar = container.querySelector('.daily-progress-bar--protein');
    expect(proteinBar).toHaveStyle({ width: '100%' });
  });

  it('caps progress bar at 100% even when goal is exceeded', () => {
    const { container } = render(
      <DailyProgressBar
        caloriesCurrent={3000}
        caloriesGoal={2600}
        proteinCurrent={0}
        proteinGoal={1}
        stepsCurrent={0}
        stepsGoal={1}
      />
    );
    const calorieBar = container.querySelector('.daily-progress-bar--calories');
    expect(calorieBar).toHaveStyle({ width: '100%' });
  });

  it('shows 0% when no progress', () => {
    const { container } = render(
      <DailyProgressBar
        caloriesCurrent={0}
        caloriesGoal={2600}
        proteinCurrent={0}
        proteinGoal={180}
        stepsCurrent={0}
        stepsGoal={10000}
      />
    );
    const bars = container.querySelectorAll('.daily-progress-bar');
    bars.forEach(bar => {
      expect(bar).toHaveStyle({ width: '0%' });
    });
  });
});

describe('DailyProgressBar — exceeded indicator', () => {
  it('shows "over" message when calories exceeded', () => {
    render(
      <DailyProgressBar
        caloriesCurrent={3000}
        caloriesGoal={2600}
        proteinCurrent={120}
        proteinGoal={180}
        stepsCurrent={8000}
        stepsGoal={10000}
      />
    );
    expect(screen.getByText(/\+400 over/i)).toBeInTheDocument();
  });

  it('shows "over" message when protein exceeded', () => {
    render(
      <DailyProgressBar
        caloriesCurrent={1800}
        caloriesGoal={2600}
        proteinCurrent={200}
        proteinGoal={180}
        stepsCurrent={8000}
        stepsGoal={10000}
      />
    );
    expect(screen.getByText(/\+20 over/i)).toBeInTheDocument();
  });

  it('shows "over" message when steps exceeded', () => {
    render(
      <DailyProgressBar
        caloriesCurrent={1800}
        caloriesGoal={2600}
        proteinCurrent={120}
        proteinGoal={180}
        stepsCurrent={12000}
        stepsGoal={10000}
      />
    );
    expect(screen.getByText(/\+2000 over/i)).toBeInTheDocument();
  });

  it('does NOT show "over" message when under goal', () => {
    const { container } = render(
      <DailyProgressBar
        caloriesCurrent={1800}
        caloriesGoal={2600}
        proteinCurrent={120}
        proteinGoal={180}
        stepsCurrent={8000}
        stepsGoal={10000}
      />
    );
    const overMessages = container.querySelectorAll('.daily-progress-exceeded');
    expect(overMessages).toHaveLength(0);
  });

  it('shows "over" for only the exceeded metrics', () => {
    const { container } = render(
      <DailyProgressBar
        caloriesCurrent={3000}
        caloriesGoal={2600}
        proteinCurrent={120}
        proteinGoal={180}
        stepsCurrent={8000}
        stepsGoal={10000}
      />
    );
    const overMessages = container.querySelectorAll('.daily-progress-exceeded');
    expect(overMessages).toHaveLength(1); // only calories exceeded
  });
});

describe('DailyProgressBar — null/zero handling', () => {
  it('handles null/undefined values with defaults', () => {
    render(
      <DailyProgressBar
        caloriesCurrent={null}
        caloriesGoal={null}
        proteinCurrent={undefined}
        proteinGoal={undefined}
        stepsCurrent={null}
        stepsGoal={null}
      />
    );
    // Should render without crashing and show 0/0 values
    expect(screen.getByText(/0\/0 kcal/i)).toBeInTheDocument();
    expect(screen.getByText(/0\/0 g/i)).toBeInTheDocument();
    expect(screen.getByText(/0\/1000 steps/i)).toBeInTheDocument(); // steps has a default goal of 1000
  });

  it('rounds fractional values in display', () => {
    render(
      <DailyProgressBar
        caloriesCurrent={1234.567}
        caloriesGoal={2600}
        proteinCurrent={123.456}
        proteinGoal={180}
        stepsCurrent={8765.432}
        stepsGoal={10000}
      />
    );
    expect(screen.getByText(/1235\/2600 kcal/i)).toBeInTheDocument(); // rounded to 1235
    expect(screen.getByText(/123\/180 g/i)).toBeInTheDocument(); // rounded to 123
    expect(screen.getByText(/8765\/10000 steps/i)).toBeInTheDocument(); // rounded to 8765
  });
});

describe('DailyProgressBar — styling', () => {
  it('applies correct color class to calories bar', () => {
    const { container } = render(
      <DailyProgressBar
        caloriesCurrent={1800}
        caloriesGoal={2600}
        proteinCurrent={0}
        proteinGoal={1}
        stepsCurrent={0}
        stepsGoal={1}
      />
    );
    const bar = container.querySelector('.daily-progress-bar--calories');
    expect(bar).toHaveClass('daily-progress-bar--calories');
  });

  it('applies correct color class to protein bar', () => {
    const { container } = render(
      <DailyProgressBar
        caloriesCurrent={0}
        caloriesGoal={1}
        proteinCurrent={120}
        proteinGoal={180}
        stepsCurrent={0}
        stepsGoal={1}
      />
    );
    const bar = container.querySelector('.daily-progress-bar--protein');
    expect(bar).toHaveClass('daily-progress-bar--protein');
  });

  it('applies correct color class to steps bar', () => {
    const { container } = render(
      <DailyProgressBar
        caloriesCurrent={0}
        caloriesGoal={1}
        proteinCurrent={0}
        proteinGoal={1}
        stepsCurrent={8000}
        stepsGoal={10000}
      />
    );
    const bar = container.querySelector('.daily-progress-bar--steps');
    expect(bar).toHaveClass('daily-progress-bar--steps');
  });
});
