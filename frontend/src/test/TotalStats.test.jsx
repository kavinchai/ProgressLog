/**
 * TotalStats page — calendar view tests.
 *
 * The Full Log section renders a month-grid calendar. Each day cell shows
 * Weight, Calories, Protein, Steps, Workout (in that order). Clicking a
 * past/today cell opens an overlay with the existing DayDetail.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TotalStats from '../pages/TotalStats';

// ── Static mocks ─────────────────────────────────────────────────────────────
vi.mock('../pages/TotalStats.css', () => ({}));
vi.mock('../pages/WeeklyStats.css', () => ({}));

// Stub DayDetail — has its own behavior; we only verify it renders with the right date
vi.mock('../components/DayDetail', () => ({
	default: ({ date }) => (
		<div data-testid="day-detail" data-date={date}>
			DayDetail for {date}
		</div>
	),
}));

vi.mock('../components/WeightLineChart', () => ({
	default: () => <div data-testid="weight-chart" />,
}));

vi.mock('../hooks/useWeightLog', () => ({ default: vi.fn() }));
vi.mock('../hooks/useNutrition', () => ({ default: vi.fn() }));
vi.mock('../hooks/useWorkouts', () => ({ default: vi.fn() }));
vi.mock('../hooks/useSteps', () => ({ default: vi.fn() }));
vi.mock('../hooks/useWeightUnit', () => ({ default: vi.fn() }));

import useWeightLog from '../hooks/useWeightLog';
import useNutrition from '../hooks/useNutrition';
import useWorkouts from '../hooks/useWorkouts';
import useSteps from '../hooks/useSteps';
import useWeightUnit from '../hooks/useWeightUnit';

// Pin "today" so the calendar's active month is deterministic.
// 2026-04-15 12:00 local time → April 2026
beforeEach(() => {
	vi.useFakeTimers({
		toFake: ['Date'],
		now: new Date(2026, 3, 15, 12, 0, 0),
	});
});

beforeEach(() => {
	vi.clearAllMocks();
	useWeightUnit.mockReturnValue({
		unit: 'lbs',
		toDisplay: (v) => v,
		toggleUnit: vi.fn(),
	});
	useWeightLog.mockReturnValue({
		data: [{ id: 1, logDate: '2026-04-10', weightLbs: 180 }],
		refetch: vi.fn(),
	});
	useNutrition.mockReturnValue({
		data: [
			{
				id: 11,
				logDate: '2026-04-10',
				dayType: 'training',
				totalCalories: 2400,
				totalProtein: 180,
				meals: [],
			},
		],
		refetch: vi.fn(),
	});
	useWorkouts.mockReturnValue({
		data: [
			{
				id: 21,
				sessionDate: '2026-04-10',
				sessionName: 'Push Day',
				exerciseSets: [],
			},
		],
		refetch: vi.fn(),
	});
	useSteps.mockReturnValue({
		data: [{ id: 31, logDate: '2026-04-10', steps: 8500 }],
		refetch: vi.fn(),
	});
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('TotalStats — calendar view', () => {
	it('renders weekday headers (Sun–Sat)', () => {
		render(<TotalStats />);
		// All seven 3-letter weekday headers should appear
		['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((d) => {
			expect(screen.getAllByText(d).length).toBeGreaterThan(0);
		});
	});

	it('renders a calendar cell for each day in the active month', () => {
		render(<TotalStats />);
		const cells = screen.getAllByTestId(/^calendar-day-/);
		// April 2026 has 30 days
		expect(cells.length).toBe(30);
	});

	it('renders a day cell with the date number', () => {
		render(<TotalStats />);
		const cell = screen.getByTestId('calendar-day-2026-04-10');
		expect(within(cell).getByText('10')).toBeInTheDocument();
	});

	it('shows weight, calories, protein, steps, workout on a day with data', () => {
		render(<TotalStats />);
		const cell = screen.getByTestId('calendar-day-2026-04-10');
		expect(within(cell).getByText(/180.*lbs/i)).toBeInTheDocument();
		expect(within(cell).getByText(/2400/)).toBeInTheDocument();
		expect(within(cell).getByText(/180g/)).toBeInTheDocument();
		expect(within(cell).getByText(/8,?500/)).toBeInTheDocument();
		expect(within(cell).getByText(/push day/i)).toBeInTheDocument();
	});

	it('clicking a day with data opens the DayDetail overlay', async () => {
		render(<TotalStats />);
		await userEvent.click(screen.getByTestId('calendar-day-2026-04-10'));
		const detail = await screen.findByTestId('day-detail');
		expect(detail).toHaveAttribute('data-date', '2026-04-10');
	});

	it('clicking an empty day still opens the DayDetail overlay so the user can add data', async () => {
		render(<TotalStats />);
		await userEvent.click(screen.getByTestId('calendar-day-2026-04-05'));
		const detail = await screen.findByTestId('day-detail');
		expect(detail).toHaveAttribute('data-date', '2026-04-05');
	});

	it('overlay close button hides the DayDetail', async () => {
		render(<TotalStats />);
		await userEvent.click(screen.getByTestId('calendar-day-2026-04-10'));
		expect(await screen.findByTestId('day-detail')).toBeInTheDocument();
		await userEvent.click(screen.getByRole('button', { name: /close/i }));
		expect(screen.queryByTestId('day-detail')).not.toBeInTheDocument();
	});

	it('does NOT open the overlay when a future day is clicked', async () => {
		render(<TotalStats />);
		// Today is mocked to 2026-04-15, so 2026-04-20 is future
		const future = screen.queryByTestId('calendar-day-2026-04-20');
		expect(future).toBeTruthy();
		await userEvent.click(future);
		expect(screen.queryByTestId('day-detail')).not.toBeInTheDocument();
	});

	it('Prev / Next buttons are still visible to navigate months', () => {
		render(<TotalStats />);
		expect(screen.getByRole('button', { name: /prev/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
	});
});
