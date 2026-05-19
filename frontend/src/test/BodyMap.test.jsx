import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BodyMap from '../components/BodyMap';

vi.mock('../components/BodyMap.css', () => ({}));

let capturedProps = [];

vi.mock('react-muscle-highlighter', () => ({
  default: (props) => {
    capturedProps.push(props);
    return (
      <svg data-testid={`body-${props.side}`}>
        {(props.data || []).map((d, i) => (
          <path
            key={i}
            data-slug={d.slug}
            onClick={() => props.onBodyPartPress?.({ slug: d.slug })}
          />
        ))}
      </svg>
    );
  },
}));

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
  capturedProps = [];
});

describe('BodyMap', () => {
  it('renders front and back view containers', () => {
    render(<BodyMap muscleStats={emptyStats} onSelectMuscle={() => {}} selectedMuscle={null} />);
    expect(screen.getByTestId('body-map-front')).toBeInTheDocument();
    expect(screen.getByTestId('body-map-back')).toBeInTheDocument();
  });

  it('renders two Body components (front and back)', () => {
    render(<BodyMap muscleStats={emptyStats} onSelectMuscle={() => {}} selectedMuscle={null} />);
    expect(screen.getByTestId('body-front')).toBeInTheDocument();
    expect(screen.getByTestId('body-back')).toBeInTheDocument();
  });

  it('passes side="front" and side="back" to the Body components', () => {
    render(<BodyMap muscleStats={emptyStats} onSelectMuscle={() => {}} selectedMuscle={null} />);
    expect(capturedProps[0].side).toBe('front');
    expect(capturedProps[1].side).toBe('back');
  });

  it('passes bodyData to both Body components', () => {
    render(<BodyMap muscleStats={emptyStats} onSelectMuscle={() => {}} selectedMuscle={null} />);
    expect(capturedProps[0].data).toBeDefined();
    expect(capturedProps[1].data).toBeDefined();
  });

  it('passes onBodyPartPress callback to both Body components', () => {
    render(<BodyMap muscleStats={emptyStats} onSelectMuscle={() => {}} selectedMuscle={null} />);
    expect(typeof capturedProps[0].onBodyPartPress).toBe('function');
    expect(typeof capturedProps[1].onBodyPartPress).toBe('function');
  });

  it('calls onSelectMuscle with the muscle group when a mapped slug is clicked', () => {
    const onSelect = vi.fn();
    const stats = { ...emptyStats, chest: { count: 1, exercises: [] } };
    render(<BodyMap muscleStats={stats} onSelectMuscle={onSelect} selectedMuscle={null} />);
    const chestPath = screen.getAllByRole('generic').find(el => el.tagName === 'path' && el.dataset.slug === 'chest')
      || document.querySelector('[data-slug="chest"]');
    fireEvent.click(chestPath);
    expect(onSelect).toHaveBeenCalledWith('chest');
  });

  it('calls onSelectMuscle with null when clicking the already selected muscle group', () => {
    const onSelect = vi.fn();
    const stats = { ...emptyStats, chest: { count: 1, exercises: [] } };
    render(<BodyMap muscleStats={stats} onSelectMuscle={onSelect} selectedMuscle="chest" />);
    const chestPath = document.querySelector('[data-slug="chest"]');
    fireEvent.click(chestPath);
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('does not call onSelectMuscle for unmapped slugs (e.g. head)', () => {
    const onSelect = vi.fn();
    // head is not in our GROUP_TO_SLUGS mapping, so even if rendered it should not trigger
    capturedProps = [];
    render(<BodyMap muscleStats={emptyStats} onSelectMuscle={onSelect} selectedMuscle={null} />);
    // Manually call the callback with an unmapped slug
    capturedProps[0].onBodyPartPress({ slug: 'head' });
    expect(onSelect).not.toHaveBeenCalled();
  });
});
