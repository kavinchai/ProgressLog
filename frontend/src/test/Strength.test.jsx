/**
 * Strength page — sidebar list + detail panel layout.
 *
 * The page is structured as:
 *   1. Sidebar list of tracked exercises (scrollable to support many entries)
 *   2. Detail panel for the active lift, containing:
 *      - Stat row (current max, sessions, improvement, last trained)
 *      - Weight progression chart (always visible — not behind a toggle)
 *      - Session history table sorted by date descending; PR row highlighted
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Strength from '../pages/Strength';

vi.mock('../pages/Strength.css', () => ({}));

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

vi.mock('../hooks/useWeightUnit', () => ({
	default: () => ({ unit: 'lbs', toDisplay: (v) => v, toggleUnit: vi.fn() }),
}));

const STRENGTH_DATA = [
	{
		exerciseName: 'Bench Press',
		data: [
			{ sessionDate: '2026-04-01', maxWeightLbs: 135, setCount: 3, repScheme: '8/8/8' },
			{ sessionDate: '2026-04-08', maxWeightLbs: 145, setCount: 3, repScheme: '6/6/6' },
			{ sessionDate: '2026-04-15', maxWeightLbs: 155, setCount: 3, repScheme: '5/5/5' },
		],
	},
	{
		exerciseName: 'Squat',
		data: [
			{ sessionDate: '2026-04-05', maxWeightLbs: 185, setCount: 5, repScheme: '5/5/5/5/5' },
			{ sessionDate: '2026-04-12', maxWeightLbs: 195, setCount: 5, repScheme: '5/5/5/5/5' },
		],
	},
];

beforeEach(() => {
	// Pin "today" to 2026-04-15 noon so "last trained" is deterministic
	vi.useFakeTimers({
		toFake: ['Date'],
		now: new Date(2026, 3, 15, 12, 0, 0),
	});
	vi.clearAllMocks();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('Strength page — states', () => {
	it('shows loading state initially', () => {
		mockApiGet.mockReturnValue(new Promise(() => {}));
		render(<Strength />);
		expect(screen.getByText(/loading/i)).toBeInTheDocument();
	});

	it('shows error state on API failure', async () => {
		mockApiGet.mockRejectedValue(new Error('Network error'));
		render(<Strength />);
		await waitFor(() => {
			expect(screen.getByText(/error/i)).toBeInTheDocument();
		});
	});

	it('shows empty state when no exercises tracked', async () => {
		mockApiGet.mockResolvedValue({ data: [] });
		render(<Strength />);
		await waitFor(() => {
			expect(screen.getByText(/no strength data/i)).toBeInTheDocument();
		});
	});
});

describe('Strength page — sidebar list', () => {
	beforeEach(() => {
		mockApiGet.mockResolvedValue({ data: STRENGTH_DATA });
	});

	it('renders a list item button for each tracked exercise', async () => {
		render(<Strength />);
		await screen.findByRole('button', { name: 'Bench Press' });
		expect(screen.getByRole('button', { name: 'Squat' })).toBeInTheDocument();
	});

	it('auto-selects the first exercise on mount', async () => {
		render(<Strength />);
		const bench = await screen.findByRole('button', { name: 'Bench Press' });
		expect(bench).toHaveAttribute('aria-pressed', 'true');
		const squat = screen.getByRole('button', { name: 'Squat' });
		expect(squat).toHaveAttribute('aria-pressed', 'false');
	});

	it('switches active exercise when a different list item is clicked', async () => {
		render(<Strength />);
		const squat = await screen.findByRole('button', { name: 'Squat' });
		await userEvent.click(squat);
		expect(squat).toHaveAttribute('aria-pressed', 'true');
		const bench = screen.getByRole('button', { name: 'Bench Press' });
		expect(bench).toHaveAttribute('aria-pressed', 'false');
	});

	it('shows the total exercise count in the sidebar header', async () => {
		render(<Strength />);
		const sidebar = await screen.findByTestId('strength-sidebar');
		// 2 exercises in STRENGTH_DATA
		expect(within(sidebar).getByText(/2/)).toBeInTheDocument();
	});

	it('shows current max next to each exercise name in the sidebar', async () => {
		render(<Strength />);
		const sidebar = await screen.findByTestId('strength-sidebar');
		// Bench Press current max = 155, Squat current max = 195
		expect(within(sidebar).getByText(/155/)).toBeInTheDocument();
		expect(within(sidebar).getByText(/195/)).toBeInTheDocument();
	});

	it('sorts exercises by session frequency descending (most sessions first)', async () => {
		const frequencyData = [
			{
				exerciseName: 'Deadlift',
				data: [
					{ sessionDate: '2026-04-01', maxWeightLbs: 225, setCount: 3, repScheme: '5/5/5' },
				],
			},
			{
				exerciseName: 'Overhead Press',
				data: [
					{ sessionDate: '2026-04-01', maxWeightLbs: 95,  setCount: 3, repScheme: '8/8/8' },
					{ sessionDate: '2026-04-08', maxWeightLbs: 100, setCount: 3, repScheme: '8/8/8' },
					{ sessionDate: '2026-04-15', maxWeightLbs: 105, setCount: 3, repScheme: '8/8/8' },
				],
			},
		];
		mockApiGet.mockResolvedValue({ data: frequencyData });
		render(<Strength />);
		const sidebar = await screen.findByTestId('strength-sidebar');
		const buttons = within(sidebar).getAllByRole('button');
		// Overhead Press (3 sessions) must appear before Deadlift (1 session)
		expect(buttons[0]).toHaveTextContent('Overhead Press');
		expect(buttons[1]).toHaveTextContent('Deadlift');
	});
});

describe('Strength page — stat row for active exercise', () => {
	beforeEach(() => {
		mockApiGet.mockResolvedValue({ data: STRENGTH_DATA });
	});

	it('shows current max for the active exercise', async () => {
		render(<Strength />);
		const card = await screen.findByTestId('stat-current-max');
		expect(within(card).getByText(/155/)).toBeInTheDocument();
	});

	it('shows total session count', async () => {
		render(<Strength />);
		const card = await screen.findByTestId('stat-sessions');
		expect(within(card).getByText('3')).toBeInTheDocument();
	});

	it('shows improvement since first session', async () => {
		render(<Strength />);
		const card = await screen.findByTestId('stat-improvement');
		// 155 - 135 = +20
		expect(within(card).getByText(/\+20/)).toBeInTheDocument();
	});

	it('shows "today" when last session was today', async () => {
		render(<Strength />);
		const card = await screen.findByTestId('stat-last-trained');
		expect(within(card).getByText(/today/i)).toBeInTheDocument();
	});

	it('shows N days ago for older sessions', async () => {
		render(<Strength />);
		await screen.findByRole('button', { name: 'Squat' });
		await userEvent.click(screen.getByRole('button', { name: 'Squat' }));
		const card = await screen.findByTestId('stat-last-trained');
		// Squat last trained 2026-04-12; today is 2026-04-15 → 3 days ago
		expect(within(card).getByText(/3 days ago/i)).toBeInTheDocument();
	});

	it('updates stats when active exercise changes', async () => {
		render(<Strength />);
		await screen.findByRole('button', { name: 'Squat' });
		await userEvent.click(screen.getByRole('button', { name: 'Squat' }));
		const max = await screen.findByTestId('stat-current-max');
		expect(within(max).getByText(/195/)).toBeInTheDocument();
		const sessions = screen.getByTestId('stat-sessions');
		expect(within(sessions).getByText('2')).toBeInTheDocument();
	});
});

describe('Strength page — session history table', () => {
	beforeEach(() => {
		mockApiGet.mockResolvedValue({ data: STRENGTH_DATA });
	});

	it('renders the chart for the active exercise without needing a toggle', async () => {
		render(<Strength />);
		expect(await screen.findByTestId('line-chart')).toBeInTheDocument();
	});

	it('renders one row per session', async () => {
		render(<Strength />);
		const table = await screen.findByTestId('session-history-table');
		const rows = within(table).getAllByRole('row');
		// Header row + 3 sessions for Bench Press
		expect(rows).toHaveLength(4);
	});

	it('sorts sessions by date descending (most recent first)', async () => {
		render(<Strength />);
		const table = await screen.findByTestId('session-history-table');
		const rows = within(table).getAllByRole('row').slice(1); // skip header
		// Most recent (2026-04-15) should be first
		expect(rows[0]).toHaveTextContent('2026-04-15');
		expect(rows[1]).toHaveTextContent('2026-04-08');
		expect(rows[2]).toHaveTextContent('2026-04-01');
	});

	it('highlights the PR row (max-weight session) with a distinct class', async () => {
		render(<Strength />);
		const table = await screen.findByTestId('session-history-table');
		const rows = within(table).getAllByRole('row').slice(1);
		// Bench Press PR is the 155 lb session on 2026-04-15
		const prRow = rows.find((r) => r.textContent.includes('155'));
		expect(prRow).toHaveClass('strength-pr-row');
	});

	it('does not highlight non-PR rows', async () => {
		render(<Strength />);
		const table = await screen.findByTestId('session-history-table');
		const rows = within(table).getAllByRole('row').slice(1);
		const nonPrRow = rows.find((r) => r.textContent.includes('135'));
		expect(nonPrRow).not.toHaveClass('strength-pr-row');
	});
});
