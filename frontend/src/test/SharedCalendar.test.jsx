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

  it('consolidates multiple sets of the same exercise into one block', async () => {
    mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
    const { container } = renderCalendar();
    await waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument());

    // alice has 3 Bench Press sets + 1 Squats set -> 2 exercise blocks, not 4
    const aliceBlocks = container.querySelectorAll(
      `[data-testid="shared-day-${WEEK[2]}"] .sc-exercise`
    );
    expect(aliceBlocks.length).toBe(2);
  });

  it('shows the per-set reps for a consolidated exercise block', async () => {
    mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
    renderCalendar();
    await waitFor(() => {
      // Bench Press at 185 lbs, reps 5 / 5 / 4
      expect(screen.getByText(/bench press/i)).toBeInTheDocument();
      expect(screen.getByText(/185 lbs/i)).toBeInTheDocument();
      expect(screen.getByText(/5\s+5\s+4/)).toBeInTheDocument();
    });
  });

  it('renders a run entry with distance and duration', async () => {
    mockApiGet.mockResolvedValue({ data: CALENDAR_DATA });
    renderCalendar();
    await waitFor(() => {
      expect(screen.getByText(/run/i)).toBeInTheDocument();
      expect(screen.getByText(/3\.2/)).toBeInTheDocument();
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

  it('merges multiple same-day sessions for one user into a single consolidated block', async () => {
    // qaf-test logged three separate sessions on the same day, each with one
    // Overhead Press set at 95×5. The cell should show ONE block "Overhead Press
    // · 95 lbs · 5 5 5" — not three blocks.
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
    const { container } = renderCalendar();
    await waitFor(() => expect(screen.getByText('qaf-test')).toBeInTheDocument());

    const blocks = container.querySelectorAll(
      `[data-testid="shared-day-${TODAY}"] .sc-exercise`
    );
    expect(blocks.length).toBe(1);
    expect(screen.getByText(/overhead press/i)).toBeInTheDocument();
    expect(screen.getByText(/95 lbs/i)).toBeInTheDocument();
    expect(screen.getByText(/5\s+5\s+5/)).toBeInTheDocument();

    // Username appears once, not three times.
    expect(screen.getAllByText('qaf-test').length).toBe(1);
  });

  it('shows an error message when the fetch fails', async () => {
    mockApiGet.mockRejectedValue({ response: { data: { message: 'Server error' } } });
    renderCalendar();
    await waitFor(() => expect(screen.getByText(/server error/i)).toBeInTheDocument());
  });
});
