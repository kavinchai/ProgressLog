/**
 * WeeklyStats page — current-week view tests.
 *
 * The Daily Log table renders the 7 dates of the current calendar week
 * (Sunday → Saturday), with Sunday at the top and Saturday at the bottom.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import WeeklyStats from '../pages/WeeklyStats';

vi.mock('../pages/WeeklyStats.css', () => ({}));

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

beforeEach(() => {
	// 2026-05-06 is a Wednesday → week is 2026-05-03 (Sun) to 2026-05-09 (Sat)
	vi.useFakeTimers({
		toFake: ['Date'],
		now: new Date(2026, 4, 6, 12, 0, 0),
	});
	vi.clearAllMocks();
	useWeightUnit.mockReturnValue({
		unit: 'lbs',
		toDisplay: (v) => v,
		toggleUnit: vi.fn(),
	});
	useWeightLog.mockReturnValue({ data: [], refetch: vi.fn() });
	useNutrition.mockReturnValue({ data: [], refetch: vi.fn() });
	useWorkouts.mockReturnValue({ data: [], refetch: vi.fn() });
	useSteps.mockReturnValue({ data: [], refetch: vi.fn() });
});

afterEach(() => {
	vi.useRealTimers();
});

describe('WeeklyStats — current week', () => {
	it('shows "this week" label in the header', () => {
		render(<WeeklyStats />);
		expect(screen.getByText(/this week/i)).toBeInTheDocument();
	});

	it('renders 7 rows for the current calendar week', () => {
		render(<WeeklyStats />);
		const rows = screen.getAllByText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) \d+\/\d+$/);
		expect(rows).toHaveLength(7);
	});

	it('renders dates from Sunday to Saturday in calendar order', () => {
		render(<WeeklyStats />);
		const cells = screen.getAllByText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) \d+\/\d+$/);
		expect(cells[0]).toHaveTextContent('Sun 5/3');
		expect(cells[1]).toHaveTextContent('Mon 5/4');
		expect(cells[2]).toHaveTextContent('Tue 5/5');
		expect(cells[3]).toHaveTextContent('Wed 5/6');
		expect(cells[4]).toHaveTextContent('Thu 5/7');
		expect(cells[5]).toHaveTextContent('Fri 5/8');
		expect(cells[6]).toHaveTextContent('Sat 5/9');
	});

	it('does not include dates from the previous week', () => {
		render(<WeeklyStats />);
		// 2026-05-02 (Sat of prior week) and 2026-05-10 (Sun of next week) should not appear
		expect(screen.queryByText(/Sat 5\/2/)).not.toBeInTheDocument();
		expect(screen.queryByText(/Sun 5\/10/)).not.toBeInTheDocument();
	});

	it('renders data only on dates within the current week', () => {
		// Logs on 2026-05-04 (Mon, in week) and 2026-05-01 (Fri, prior week)
		useWeightLog.mockReturnValue({
			data: [
				{ id: 1, logDate: '2026-05-04', weightLbs: 175 },
				{ id: 2, logDate: '2026-05-01', weightLbs: 999 },
			],
			refetch: vi.fn(),
		});
		render(<WeeklyStats />);
		// In-week weight shows up
		expect(screen.getByText(/175 lbs/i)).toBeInTheDocument();
		// Prior-week weight does NOT
		expect(screen.queryByText(/999 lbs/i)).not.toBeInTheDocument();
	});
});
