import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Cardio from '../pages/Cardio';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../pages/Cardio.css', () => ({}));

// Mock recharts to avoid canvas issues in jsdom
vi.mock('recharts', () => ({
  LineChart:           ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line:                () => null,
  BarChart:            ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar:                 () => null,
  XAxis:               () => null,
  YAxis:               () => null,
  CartesianGrid:       () => null,
  Tooltip:             () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
}));

const mockApiGet = vi.fn();
vi.mock('../api', () => ({
  default: { get: (...args) => mockApiGet(...args) },
}));

// ── Test data ────────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Running has 3 sessions: two recent + one >30 days old (used by range filter test)
const CARDIO_DATA = [
  {
    exerciseName: 'Running',
    data: [
      { sessionDate: daysAgo(60), totalDistanceMiles: 2.0,  totalDurationSeconds: 1500 }, // outside 4W
      { sessionDate: daysAgo(5),  totalDistanceMiles: 3.1,  totalDurationSeconds: 1800 }, // 30m
      { sessionDate: daysAgo(1),  totalDistanceMiles: 5.0,  totalDurationSeconds: 2700 }, // 45m, best pace
    ],
  },
  {
    exerciseName: 'Cycling',
    data: [
      { sessionDate: daysAgo(2),  totalDistanceMiles: 10.0, totalDurationSeconds: 2400 }, // 40m
    ],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Cardio page', () => {
  it('shows loading state initially', () => {
    mockApiGet.mockReturnValue(new Promise(() => {})); // never resolves
    render(<Cardio />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error state on API failure', async () => {
    mockApiGet.mockRejectedValue(new Error('Network error'));
    render(<Cardio />);
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no cardio data', async () => {
    mockApiGet.mockResolvedValue({ data: [] });
    render(<Cardio />);
    await waitFor(() => {
      expect(screen.getByText(/no cardio/i)).toBeInTheDocument();
    });
  });

  it('calls the correct API endpoint', async () => {
    mockApiGet.mockResolvedValue({ data: [] });
    render(<Cardio />);
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/progress/cardio');
    });
  });

  it('renders sidebar with all exercise names', async () => {
    mockApiGet.mockResolvedValue({ data: CARDIO_DATA });
    render(<Cardio />);
    await waitFor(() => {
      const sidebar = screen.getByTestId('cardio-sidebar');
      expect(within(sidebar).getByText('Running')).toBeInTheDocument();
      expect(within(sidebar).getByText('Cycling')).toBeInTheDocument();
    });
  });

  it('selects most-trained exercise by default', async () => {
    mockApiGet.mockResolvedValue({ data: CARDIO_DATA });
    render(<Cardio />);
    await waitFor(() => {
      const sidebar = screen.getByTestId('cardio-sidebar');
      const runningBtn = within(sidebar).getByRole('button', { name: 'Running' });
      expect(runningBtn).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('switches active exercise when sidebar item is clicked', async () => {
    mockApiGet.mockResolvedValue({ data: CARDIO_DATA });
    render(<Cardio />);
    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByTestId('cardio-sidebar')).toBeInTheDocument();
    });

    const sidebar = screen.getByTestId('cardio-sidebar');
    const cyclingBtn = within(sidebar).getByRole('button', { name: 'Cycling' });
    await user.click(cyclingBtn);

    expect(cyclingBtn).toHaveAttribute('aria-pressed', 'true');
    const runningBtn = within(sidebar).getByRole('button', { name: 'Running' });
    expect(runningBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders weekly volume bar chart and pace line chart by default (no expand needed)', async () => {
    mockApiGet.mockResolvedValue({ data: CARDIO_DATA });
    render(<Cardio />);
    await waitFor(() => {
      // Both charts should be visible without any clicks
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  it('displays PR stats row (best pace, longest run, best week, total miles)', async () => {
    mockApiGet.mockResolvedValue({ data: CARDIO_DATA });
    render(<Cardio />);
    await waitFor(() => {
      expect(screen.getByTestId('stat-best-pace')).toBeInTheDocument();
      expect(screen.getByTestId('stat-longest-run')).toBeInTheDocument();
      expect(screen.getByTestId('stat-best-week')).toBeInTheDocument();
      expect(screen.getByTestId('stat-total-miles')).toBeInTheDocument();
    });
    // Longest run for Running active = 5.00 mi
    expect(within(screen.getByTestId('stat-longest-run')).getByText(/5\.00 mi/)).toBeInTheDocument();
  });

  it('renders time range filter buttons', async () => {
    mockApiGet.mockResolvedValue({ data: CARDIO_DATA });
    render(<Cardio />);
    await waitFor(() => {
      const group = screen.getByRole('group', { name: /time range/i });
      expect(within(group).getByRole('button', { name: '4W' })).toBeInTheDocument();
      expect(within(group).getByRole('button', { name: '3M' })).toBeInTheDocument();
      expect(within(group).getByRole('button', { name: '6M' })).toBeInTheDocument();
      expect(within(group).getByRole('button', { name: 'All' })).toBeInTheDocument();
    });
  });

  it('defaults to "All" range and toggles active state when range changes', async () => {
    mockApiGet.mockResolvedValue({ data: CARDIO_DATA });
    render(<Cardio />);
    const user = userEvent.setup();
    await waitFor(() => {
      const allBtn = screen.getByRole('button', { name: 'All' });
      expect(allBtn).toHaveAttribute('aria-pressed', 'true');
    });

    const fourWBtn = screen.getByRole('button', { name: '4W' });
    await user.click(fourWBtn);
    expect(fourWBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('filters session list when 4W range is selected (drops the 60-day-old session)', async () => {
    mockApiGet.mockResolvedValue({ data: CARDIO_DATA });
    render(<Cardio />);
    const user = userEvent.setup();
    await waitFor(() => {
      // All 3 Running sessions visible in session log at "All"
      const log = document.querySelector('.cardio-session-list');
      expect(log).not.toBeNull();
      expect(within(log).getByText('5.00 mi')).toBeInTheDocument();
      expect(within(log).getByText('3.10 mi')).toBeInTheDocument();
      expect(within(log).getByText('2.00 mi')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '4W' }));

    await waitFor(() => {
      const log = document.querySelector('.cardio-session-list');
      // 60-day-old session should now be hidden
      expect(within(log).queryByText('2.00 mi')).not.toBeInTheDocument();
      // Recent ones remain
      expect(within(log).getByText('5.00 mi')).toBeInTheDocument();
      expect(within(log).getByText('3.10 mi')).toBeInTheDocument();
    });
  });

  it('displays compact session log with distance, duration, and pace', async () => {
    mockApiGet.mockResolvedValue({ data: CARDIO_DATA });
    render(<Cardio />);
    await waitFor(() => {
      const log = document.querySelector('.cardio-session-list');
      expect(log).not.toBeNull();
      // Distance
      expect(within(log).getByText('5.00 mi')).toBeInTheDocument();
      expect(within(log).getByText('3.10 mi')).toBeInTheDocument();
      // Duration formatted
      expect(within(log).getByText('30m 0s')).toBeInTheDocument();
      expect(within(log).getByText('45m 0s')).toBeInTheDocument();
      // Pace (5mi / 2700s = 540s/mi = 9:00 /mi)
      expect(within(log).getByText(/9:00 \/mi/)).toBeInTheDocument();
    });
  });

  it('shows total miles aggregating all Running sessions', async () => {
    mockApiGet.mockResolvedValue({ data: CARDIO_DATA });
    render(<Cardio />);
    await waitFor(() => {
      // 2.0 + 3.1 + 5.0 = 10.1
      expect(within(screen.getByTestId('stat-total-miles')).getByText(/10\.1 mi/)).toBeInTheDocument();
    });
  });
});
