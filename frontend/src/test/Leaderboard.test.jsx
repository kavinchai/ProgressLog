import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Leaderboard from '../pages/Leaderboard';

vi.mock('../pages/Leaderboard.css', () => ({}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart:            ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar:                 () => null,
  LineChart:           ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line:                () => null,
  XAxis:               () => null,
  YAxis:               () => null,
  CartesianGrid:       () => null,
  Tooltip:             () => null,
  Legend:              () => null,
}));

const mockApiGet = vi.fn();
vi.mock('../api', () => ({ default: { get: (...args) => mockApiGet(...args) } }));

function renderLeaderboard() {
  return render(<MemoryRouter><Leaderboard /></MemoryRouter>);
}

const LEADERBOARD_DATA = {
  totalUsers: 3,
  totalSessions: 15,
  totalSets: 120,
  exercises: [
    {
      exerciseName: 'Bench Press',
      type: 'strength',
      totalSets: 60,
      participantCount: 2,
      entries: [
        { rank: 1, username: 'alice', score: 700,  bestWeight: 175, bestReps: 4, totalDistance: null, totalDurationSeconds: null, achievedDate: '2026-05-01' },
        { rank: 2, username: 'bob',   score: 600,  bestWeight: 150, bestReps: 4, totalDistance: null, totalDurationSeconds: null, achievedDate: '2026-04-20' },
      ],
    },
    {
      exerciseName: 'Squats',
      type: 'strength',
      totalSets: 30,
      participantCount: 1,
      entries: [
        { rank: 1, username: 'bob', score: 600, bestWeight: 200, bestReps: 3, totalDistance: null, totalDurationSeconds: null, achievedDate: '2026-04-15' },
      ],
    },
    {
      exerciseName: 'Running',
      type: 'cardio',
      totalSets: 30,
      participantCount: 1,
      entries: [
        { rank: 1, username: 'carol', score: 5.0, bestWeight: null, bestReps: null, totalDistance: 5.0, totalDurationSeconds: 1800, achievedDate: '2026-05-05' },
      ],
    },
  ],
  topLifters: [
    { rank: 1, username: 'alice', sessionCount: 8,  totalSets: 70, totalVolumeLbs: 42000 },
    { rank: 2, username: 'bob',   sessionCount: 5,  totalSets: 40, totalVolumeLbs: 28000 },
    { rank: 3, username: 'carol', sessionCount: 2,  totalSets: 10, totalVolumeLbs: 5000  },
  ],
  activity: [
    { date: '2026-05-01', sessionCount: 2, setCount: 20 },
    { date: '2026-05-02', sessionCount: 1, setCount: 10 },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Topbar ────────────────────────────────────────────────────────────────────

describe('Leaderboard — topbar', () => {
  it('shows the brand name', () => {
    mockApiGet.mockReturnValue(new Promise(() => {}));
    renderLeaderboard();
    expect(screen.getAllByText(/progresslog/i).length).toBeGreaterThan(0);
  });

  it('has a Sign In link pointing to /login', () => {
    mockApiGet.mockReturnValue(new Promise(() => {}));
    renderLeaderboard();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });

  it('has a Create Account link pointing to /login?mode=signup', () => {
    mockApiGet.mockReturnValue(new Promise(() => {}));
    renderLeaderboard();
    expect(
      screen.getByRole('link', { name: /create account/i })
    ).toHaveAttribute('href', '/login?mode=signup');
  });
});

// ── Loading / error / empty states ────────────────────────────────────────────

describe('Leaderboard — loading / error / empty states', () => {
  it('shows loading text while fetching', () => {
    mockApiGet.mockReturnValue(new Promise(() => {}));
    renderLeaderboard();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error message when the API call fails with a message', async () => {
    mockApiGet.mockRejectedValue({ response: { data: { message: 'Server error' } } });
    renderLeaderboard();
    await waitFor(() => expect(screen.getByText(/server error/i)).toBeInTheDocument());
  });

  it('shows a generic error message when the rejection has no message', async () => {
    mockApiGet.mockRejectedValue(new Error('network'));
    renderLeaderboard();
    await waitFor(() => expect(screen.getByText(/could not load/i)).toBeInTheDocument());
  });

  it('shows the opt-in empty state when totalUsers is 0', async () => {
    mockApiGet.mockResolvedValue({ data: { ...LEADERBOARD_DATA, totalUsers: 0 } });
    renderLeaderboard();
    await waitFor(() =>
      expect(screen.getByText(/no one has opted in/i)).toBeInTheDocument()
    );
  });
});

// ── Stats strip ───────────────────────────────────────────────────────────────

describe('Leaderboard — stats strip', () => {
  it('shows Lifters, Sessions, and Sets labels', async () => {
    mockApiGet.mockResolvedValue({ data: LEADERBOARD_DATA });
    renderLeaderboard();
    await waitFor(() => {
      expect(screen.getByText(/^lifters$/i)).toBeInTheDocument();
      expect(screen.getByText(/^sessions$/i)).toBeInTheDocument();
      expect(screen.getByText(/^sets$/i)).toBeInTheDocument();
    });
  });

  it('shows the correct totals', async () => {
    mockApiGet.mockResolvedValue({ data: LEADERBOARD_DATA });
    renderLeaderboard();
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();   // totalUsers
      expect(screen.getByText('15')).toBeInTheDocument();  // totalSessions
      expect(screen.getByText('120')).toBeInTheDocument(); // totalSets
    });
  });
});

// ── Top lifters ───────────────────────────────────────────────────────────────

describe('Leaderboard — top lifters table', () => {
  it('renders usernames in the table', async () => {
    mockApiGet.mockResolvedValue({ data: LEADERBOARD_DATA });
    renderLeaderboard();
    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument();
      expect(screen.getByText('bob')).toBeInTheDocument();
      expect(screen.getByText('carol')).toBeInTheDocument();
    });
  });

  it('shows volume formatted with lbs suffix', async () => {
    mockApiGet.mockResolvedValue({ data: LEADERBOARD_DATA });
    renderLeaderboard();
    await waitFor(() =>
      expect(screen.getByText(/42,000 lbs/i)).toBeInTheDocument()
    );
  });
});

// ── Exercise leaderboard tabs ─────────────────────────────────────────────────

describe('Leaderboard — exercise type tabs', () => {
  it('renders Strength and Cardio tab buttons', async () => {
    mockApiGet.mockResolvedValue({ data: LEADERBOARD_DATA });
    renderLeaderboard();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^strength$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^cardio$/i })).toBeInTheDocument();
    });
  });

  it('defaults to the Strength tab and shows strength exercise pills', async () => {
    mockApiGet.mockResolvedValue({ data: LEADERBOARD_DATA });
    renderLeaderboard();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /bench press/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /squats/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^running$/i })).not.toBeInTheDocument();
    });
  });

  it('switching to Cardio shows cardio exercises and hides strength pills', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValue({ data: LEADERBOARD_DATA });
    renderLeaderboard();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^cardio$/i })).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: /^cardio$/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^running$/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /bench press/i })).not.toBeInTheDocument();
    });
  });

  it('shows empty state when there are no cardio exercises', async () => {
    const user = userEvent.setup();
    const strengthOnly = {
      ...LEADERBOARD_DATA,
      exercises: LEADERBOARD_DATA.exercises.filter((e) => e.type === 'strength'),
    };
    mockApiGet.mockResolvedValue({ data: strengthOnly });
    renderLeaderboard();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^cardio$/i })).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: /^cardio$/i }));

    await waitFor(() =>
      expect(screen.getByText(/no cardio exercises/i)).toBeInTheDocument()
    );
  });
});

// ── Exercise board content ────────────────────────────────────────────────────

describe('Leaderboard — exercise board content', () => {
  it('shows the best weight for the default (first strength) exercise', async () => {
    mockApiGet.mockResolvedValue({ data: LEADERBOARD_DATA });
    renderLeaderboard();
    await waitFor(() =>
      expect(screen.getByText('175 lbs')).toBeInTheDocument()
    );
  });

  it('selecting a different strength exercise updates the board', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValue({ data: LEADERBOARD_DATA });
    renderLeaderboard();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /squats/i })).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: /squats/i }));

    await waitFor(() =>
      expect(screen.getByText('200 lbs')).toBeInTheDocument()
    );
  });

  it('cardio board shows distance in miles', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValue({ data: LEADERBOARD_DATA });
    renderLeaderboard();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^cardio$/i })).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: /^cardio$/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^running$/i })).toBeInTheDocument()
    );
    await user.click(screen.getByRole('button', { name: /^running$/i }));

    await waitFor(() =>
      expect(screen.getByText(/5\.00 mi/i)).toBeInTheDocument()
    );
  });
});

// ── API call ──────────────────────────────────────────────────────────────────

describe('Leaderboard — API', () => {
  it('calls the /leaderboard endpoint on mount', async () => {
    mockApiGet.mockResolvedValue({ data: LEADERBOARD_DATA });
    renderLeaderboard();
    await waitFor(() =>
      expect(mockApiGet).toHaveBeenCalledWith('/leaderboard')
    );
  });
});
