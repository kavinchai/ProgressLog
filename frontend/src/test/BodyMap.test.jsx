import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BodyMap from '../components/BodyMap';

vi.mock('../components/BodyMap.css', () => ({}));

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

describe('BodyMap', () => {
  it('renders SVG with muscle group regions', () => {
    render(<BodyMap muscleStats={emptyStats} onSelectMuscle={() => {}} selectedMuscle={null} />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders clickable regions for each muscle group', () => {
    render(<BodyMap muscleStats={emptyStats} onSelectMuscle={() => {}} selectedMuscle={null} />);
    const groups = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'core', 'quads', 'hamstrings', 'glutes', 'calves'];
    groups.forEach(group => {
      const region = document.querySelector(`[data-muscle="${group}"]`);
      expect(region).toBeInTheDocument();
    });
  });

  it('calls onSelectMuscle when a muscle group is clicked', () => {
    const onSelect = vi.fn();
    render(<BodyMap muscleStats={emptyStats} onSelectMuscle={onSelect} selectedMuscle={null} />);
    const chestRegion = document.querySelector('[data-muscle="chest"]');
    fireEvent.click(chestRegion);
    expect(onSelect).toHaveBeenCalledWith('chest');
  });

  it('applies heat-none class when muscle group has 0 exercises', () => {
    render(<BodyMap muscleStats={emptyStats} onSelectMuscle={() => {}} selectedMuscle={null} />);
    const chestRegion = document.querySelector('[data-muscle="chest"]');
    expect(chestRegion.classList.contains('heat-none')).toBe(true);
  });

  it('applies heat-low class when muscle group has 1-2 exercises', () => {
    const stats = {
      ...emptyStats,
      chest: { count: 2, exercises: [{ name: 'Bench Press', sets: [] }] },
    };
    render(<BodyMap muscleStats={stats} onSelectMuscle={() => {}} selectedMuscle={null} />);
    const chestRegion = document.querySelector('[data-muscle="chest"]');
    expect(chestRegion.classList.contains('heat-low')).toBe(true);
  });

  it('applies heat-high class when muscle group has 3+ exercises', () => {
    const stats = {
      ...emptyStats,
      chest: { count: 4, exercises: [] },
    };
    render(<BodyMap muscleStats={stats} onSelectMuscle={() => {}} selectedMuscle={null} />);
    const chestRegion = document.querySelector('[data-muscle="chest"]');
    expect(chestRegion.classList.contains('heat-high')).toBe(true);
  });

  it('applies selected class when muscle group is selected', () => {
    render(<BodyMap muscleStats={emptyStats} onSelectMuscle={() => {}} selectedMuscle="chest" />);
    const chestRegion = document.querySelector('[data-muscle="chest"]');
    expect(chestRegion.classList.contains('muscle-selected')).toBe(true);
  });

  it('deselects when clicking the same muscle group', () => {
    const onSelect = vi.fn();
    render(<BodyMap muscleStats={emptyStats} onSelectMuscle={onSelect} selectedMuscle="chest" />);
    const chestRegion = document.querySelector('[data-muscle="chest"]');
    fireEvent.click(chestRegion);
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
