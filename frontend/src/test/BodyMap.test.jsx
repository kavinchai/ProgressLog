import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import BodyMap from '../components/BodyMap';

vi.mock('../components/BodyMap.css', () => ({}));

const mockUpdate = vi.fn();
const mockDestroy = vi.fn();

vi.mock('body-muscles', () => ({
  BodyChart: vi.fn().mockImplementation(() => ({
    update: mockUpdate,
    destroy: mockDestroy,
  })),
  ViewSide: { FRONT: 'FRONT', BACK: 'BACK' },
}));

import { BodyChart } from 'body-muscles';

const emptyStats = {
  chest: { count: 0, exercises: [] },
  back: { count: 0, exercises: [] },
  shoulders: { count: 0, exercises: [] },
  biceps: { count: 0, exercises: [] },
  triceps: { count: 0, exercises: [] },
  forearms: { count: 0, exercises: [] },
  core: { count: 0, exercises: [] },
  quads: { count: 0, exercises: [] },
  hamstrings: { count: 0, exercises: [] },
  glutes: { count: 0, exercises: [] },
  calves: { count: 0, exercises: [] },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BodyMap', () => {
  it('renders front and back view containers', () => {
    render(<BodyMap muscleStats={emptyStats} onSelectMuscle={() => {}} selectedMuscle={null} />);
    expect(screen.getByTestId('body-map-front')).toBeInTheDocument();
    expect(screen.getByTestId('body-map-back')).toBeInTheDocument();
  });

  it('creates two BodyChart instances (front and back)', () => {
    render(<BodyMap muscleStats={emptyStats} onSelectMuscle={() => {}} selectedMuscle={null} />);
    expect(BodyChart).toHaveBeenCalledTimes(2);
    const calls = BodyChart.mock.calls;
    expect(calls[0][1].view).toBe('FRONT');
    expect(calls[1][1].view).toBe('BACK');
  });

  it('passes bodyState to both chart instances', () => {
    render(<BodyMap muscleStats={emptyStats} onSelectMuscle={() => {}} selectedMuscle={null} />);
    const calls = BodyChart.mock.calls;
    expect(calls[0][1].bodyState).toBeDefined();
    expect(calls[1][1].bodyState).toBeDefined();
  });

  it('registers onMuscleClick callback on both charts', () => {
    render(<BodyMap muscleStats={emptyStats} onSelectMuscle={() => {}} selectedMuscle={null} />);
    const calls = BodyChart.mock.calls;
    expect(typeof calls[0][1].onMuscleClick).toBe('function');
    expect(typeof calls[1][1].onMuscleClick).toBe('function');
  });

  it('calls onSelectMuscle with the muscle group when a mapped muscle is clicked', () => {
    const onSelect = vi.fn();
    render(<BodyMap muscleStats={emptyStats} onSelectMuscle={onSelect} selectedMuscle={null} />);
    const clickHandler = BodyChart.mock.calls[0][1].onMuscleClick;
    clickHandler('chest-upper-left');
    expect(onSelect).toHaveBeenCalledWith('chest');
  });

  it('calls onSelectMuscle with null when clicking the already selected muscle group', () => {
    const onSelect = vi.fn();
    render(<BodyMap muscleStats={emptyStats} onSelectMuscle={onSelect} selectedMuscle="chest" />);
    const clickHandler = BodyChart.mock.calls[0][1].onMuscleClick;
    clickHandler('chest-upper-left');
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('does not call onSelectMuscle for unmapped muscle IDs (e.g. head)', () => {
    const onSelect = vi.fn();
    render(<BodyMap muscleStats={emptyStats} onSelectMuscle={onSelect} selectedMuscle={null} />);
    const clickHandler = BodyChart.mock.calls[0][1].onMuscleClick;
    clickHandler('head');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('destroys charts on unmount', () => {
    const { unmount } = render(
      <BodyMap muscleStats={emptyStats} onSelectMuscle={() => {}} selectedMuscle={null} />
    );
    unmount();
    expect(mockDestroy).toHaveBeenCalledTimes(2);
  });
});
