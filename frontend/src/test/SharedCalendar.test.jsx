import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SharedCalendar from '../pages/SharedCalendar';
import { getCurrentWeek, localDateStr } from '../utils/date';

vi.mock('../pages/SharedCalendar.css', () => ({}));
vi.mock('../pages/TotalStats.css', () => ({}));

const mockApiGet = vi.fn();
vi.mock('../api', () => ({ default: { get: (...args) => mockApiGet(...args) } }));

function renderCalendar() {
  return render(<MemoryRouter><SharedCalendar /></MemoryRouter>);
}

const TODAY = localDateStr(new Date());
const WEEK = getCurrentWeek();

const CALENDAR_DATA = {
  totalUsers: 2,
  entries: [
    {
      username: 'alice',
      sessionDate: WEEK[2],
      sets: [
        { exerciseName: 'Bench Press', setNumber: 1, reps: 5, weightLbs: 185 },
        { exerciseName: 'Bench Press', setNumber: 2, reps: 5, weightLbs: 185 },
        { exerciseName: 'Bench Press', setNumber: 3, reps: 4, weightLbs: 185 },
        { exerciseName: 'Squats',      setNumber: 1, reps: 5, weightLbs: 225 },
      ],
    },
    {
      username: 'bob',
      sessionDate: TODAY,
      sets: [
        { exerciseName: 'Run', setNumber: 1, reps: 0, weightLbs: 0,
          distanceMiles: 3.20, durationSeconds: 1695 },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SharedCalendar', () => {
  it('shows a loading state while fetching', () => {
    mockApiGet.mockReturnValue(new Promise(() => {}));
    renderCalendar();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('calls GET /shared-calendar on mount', async () => {
    mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
    renderCalendar();
    await waitFor(() => expect(mockApiGet).toHaveBeenCalledWith('/shared-calendar'));
  });

  it('shows the opt-in empty state when no one has opted in', async () => {
    mockApiGet.mockResolvedValue({ data: { totalUsers: 0, entries: [] } });
    renderCalendar();
    await waitFor(() =>
      expect(screen.getByText(/no one has opted in/i)).toBeInTheDocument(),
    );
  });

  it('renders Week and Month view-mode tabs', async () => {
    mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
    renderCalendar();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^week$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^month$/i })).toBeInTheDocument();
    });
  });

  it('defaults to the Week view and renders 7 day cells', async () => {
    mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
    const { container } = renderCalendar();
    await waitFor(() => {
      const cells = container.querySelectorAll('.calendar-cell:not(.calendar-cell-pad)');
      expect(cells.length).toBe(7);
    });
  });

  it('week view shows entries for the current week', async () => {
    mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
    renderCalendar();
    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument();
      expect(screen.getByText('bob')).toBeInTheDocument();
    });
  });

  it('shows unique exercise names for each user in their day cell', async () => {
    mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
    renderCalendar();
    await waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument());

    // alice has Bench Press + Squats — both names should appear, no reps/weight
    expect(screen.getByText(/bench press/i)).toBeInTheDocument();
    expect(screen.getByText(/squats/i)).toBeInTheDocument();
    expect(screen.queryByText(/185 lbs/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/5\s+5\s+4/)).not.toBeInTheDocument();
  });

  it('renders a run entry showing only the exercise name', async () => {
    mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
    renderCalendar();
    await waitFor(() => {
      expect(screen.getByText(/run/i)).toBeInTheDocument();
      expect(screen.queryByText(/3\.2/)).not.toBeInTheDocument();
    });
  });

  it('switching to Month view renders a 42-cell month grid', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
    const { container } = renderCalendar();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^month$/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: /^month$/i }));
    await waitFor(() => {
      const cells = container.querySelectorAll('.calendar-grid > *');
      expect(cells.length).toBe(42);
    });
  });

  it('month view header shows the current month name', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
    renderCalendar();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^month$/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: /^month$/i }));

    const monthName = new Date().toLocaleDateString('en-US', { month: 'long' });
    await waitFor(() =>
      expect(screen.getByText(new RegExp(monthName, 'i'))).toBeInTheDocument(),
    );
  });

  it('renders weekday headers', async () => {
    mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
    renderCalendar();
    await waitFor(() => {
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((d) => {
        expect(screen.getByText(d)).toBeInTheDocument();
      });
    });
  });

  it('merges multiple same-day sessions for one user into a single entry', async () => {
    // qaf-test logged three separate sessions on the same day with Overhead Press.
    // Should show ONE user block with "Overhead Press" once — not three blocks.
    mockApiGet.mockResolvedValue({
      data: {
        totalUsers: 1,
        entries: [
          { username: 'qaf-test', sessionDate: TODAY,
            sets: [{ exerciseName: 'Overhead Press', setNumber: 1, reps: 5, weightLbs: 95 }] },
          { username: 'qaf-test', sessionDate: TODAY,
            sets: [{ exerciseName: 'Overhead Press', setNumber: 1, reps: 5, weightLbs: 95 }] },
          { username: 'qaf-test', sessionDate: TODAY,
            sets: [{ exerciseName: 'Overhead Press', setNumber: 1, reps: 5, weightLbs: 95 }] },
        ],
      },
    });
    renderCalendar();
    await waitFor(() => expect(screen.getByText('qaf-test')).toBeInTheDocument());

    // Exercise name appears once (deduplicated across sessions).
    expect(screen.getAllByText(/overhead press/i).length).toBe(1);
    // Username appears once, not three times.
    expect(screen.getAllByText('qaf-test').length).toBe(1);
  });

  it('shows an error message when the fetch fails', async () => {
    mockApiGet.mockRejectedValue({ response: { data: { message: 'Server error' } } });
    renderCalendar();
    await waitFor(() => expect(screen.getByText(/server error/i)).toBeInTheDocument());
  });
});
