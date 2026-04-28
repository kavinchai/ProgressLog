import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Cardio from '../pages/Cardio';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../pages/Cardio.css', () => ({}));

// Mock recharts to avoid canvas issues in jsdom
vi.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
}));

const mockApiGet = vi.fn();
vi.mock('../api', () => ({
  default: { get: (...args) => mockApiGet(...args) },
}));

// ── Test data ────────────────────────────────────────────────────────────────

const CARDIO_DATA = [
  {
    exerciseName: 'Running',
    data: [
      { sessionDate: '2026-04-01', totalDistanceMiles: 3.1, totalDurationSeconds: 1800 },
      { sessionDate: '2026-04-05', totalDistanceMiles: 5.0, totalDurationSeconds: 2700 },
    ],
  },
  {
    exerciseName: 'Cycling',
    data: [
      { sessionDate: '2026-04-02', totalDistanceMiles: 10.0, totalDurationSeconds: 2400 },
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

  it('renders exercise names from API data', async () => {
    mockApiGet.mockResolvedValue({ data: CARDIO_DATA });
    render(<Cardio />);
    await waitFor(() => {
      expect(screen.getAllByText('Running').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Cycling').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('displays distance and pace for each session', async () => {
    mockApiGet.mockResolvedValue({ data: CARDIO_DATA });
    render(<Cardio />);
    await waitFor(() => {
      // Running 3.1 mi
      expect(screen.getByText('3.10 mi')).toBeInTheDocument();
      // Running 5.0 mi
      expect(screen.getByText('5.00 mi')).toBeInTheDocument();
      // Cycling 10.0 mi
      expect(screen.getByText('10.00 mi')).toBeInTheDocument();
    });
  });

  it('displays formatted duration for sessions', async () => {
    mockApiGet.mockResolvedValue({ data: CARDIO_DATA });
    render(<Cardio />);
    await waitFor(() => {
      expect(screen.getByText('30m 0s')).toBeInTheDocument();   // 1800s
      expect(screen.getByText('45m 0s')).toBeInTheDocument();   // 2700s
      expect(screen.getByText('40m 0s')).toBeInTheDocument();   // 2400s
    });
  });

  it('expands a section to show chart on click', async () => {
    mockApiGet.mockResolvedValue({ data: CARDIO_DATA });
    render(<Cardio />);
    await waitFor(() => {
      expect(screen.getAllByText('Running').length).toBeGreaterThanOrEqual(1);
    });

    // Chart should not be visible initially
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();

    // Click the Running section header (in the detail card) to expand
    const runningElements = screen.getAllByText('Running');
    const sectionHeader = runningElements.find(el => el.classList.contains('cardio-section-name'));
    await userEvent.click(sectionHeader);

    // Charts should now be visible (pace + distance for Running which has 2 data points)
    expect(screen.getAllByTestId('line-chart').length).toBeGreaterThanOrEqual(1);
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
});
