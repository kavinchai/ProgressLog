import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MealModal from '../components/MealModal';

vi.mock('../api', () => ({ default: { post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock('../components/Modal.css', () => ({}));

import api from '../api';

const onClose = vi.fn();
const onSaved = vi.fn();
const LOG_ID = 42;

beforeEach(() => {
  vi.clearAllMocks();
});

// MealModal labels have no htmlFor — query by role and placeholder instead.
// Calories and Protein inputs are both type="number" (role="spinbutton").
// Index 0 = Calories, index 1 = Protein (DOM order).

describe('MealModal — adding a new meal', () => {
  it('renders "Add Meal" title', () => {
    render(<MealModal logId={LOG_ID} onClose={onClose} onSaved={onSaved} />);
    expect(screen.getByText(/Add Meal/)).toBeInTheDocument();
  });

  it('does NOT show a delete button for a new meal', () => {
    render(<MealModal logId={LOG_ID} onClose={onClose} onSaved={onSaved} />);
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('meal name starts empty (optional)', () => {
    render(<MealModal logId={LOG_ID} onClose={onClose} onSaved={onSaved} />);
    expect(screen.getByPlaceholderText(/optional/i).value).toBe('');
  });

  it('Cancel button calls onClose', async () => {
    render(<MealModal logId={LOG_ID} onClose={onClose} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('successful create POSTs to /nutrition/{logId}/meals, calls onSaved and onClose', async () => {
    api.post.mockResolvedValue({});

    render(<MealModal logId={LOG_ID} onClose={onClose} onSaved={onSaved} />);
    await userEvent.type(screen.getByPlaceholderText(/optional/i), 'Lunch');
    const spinbuttons = screen.getAllByRole('spinbutton');
    await userEvent.type(spinbuttons[0], '600'); // calories
    await userEvent.type(spinbuttons[1], '50');  // protein
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(`/nutrition/${LOG_ID}/meals`, {
        mealName: 'Lunch',
        calories: 600,
        proteinGrams: 50,
      });
      expect(onSaved).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('sends null mealName when name field is empty', async () => {
    api.post.mockResolvedValue({});

    render(<MealModal logId={LOG_ID} onClose={onClose} onSaved={onSaved} />);
    const spinbuttons = screen.getAllByRole('spinbutton');
    await userEvent.type(spinbuttons[0], '500');
    await userEvent.type(spinbuttons[1], '40');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(`/nutrition/${LOG_ID}/meals`, expect.objectContaining({
        mealName: null,
      }));
    });
  });

  it('shows error on failed create', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Invalid data' } } });

    render(<MealModal logId={LOG_ID} onClose={onClose} onSaved={onSaved} />);
    const spinbuttons = screen.getAllByRole('spinbutton');
    await userEvent.type(spinbuttons[0], '500');
    await userEvent.type(spinbuttons[1], '40');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(screen.getByText(/invalid data/i)).toBeInTheDocument());
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('shows fallback error message when response has no message', async () => {
    api.post.mockRejectedValue({});

    render(<MealModal logId={LOG_ID} onClose={onClose} onSaved={onSaved} />);
    const spinbuttons = screen.getAllByRole('spinbutton');
    await userEvent.type(spinbuttons[0], '500');
    await userEvent.type(spinbuttons[1], '40');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(screen.getByText(/failed to save/i)).toBeInTheDocument());
  });
});

describe('MealModal — editing an existing meal', () => {
  const existing = { id: 99, mealName: 'Dinner', calories: 800, proteinGrams: 60 };

  it('renders "Edit Meal" title', () => {
    render(<MealModal logId={LOG_ID} existing={existing} onClose={onClose} onSaved={onSaved} />);
    expect(screen.getByText(/Edit Meal/)).toBeInTheDocument();
  });

  it('pre-fills name, calories, and protein from existing', () => {
    render(<MealModal logId={LOG_ID} existing={existing} onClose={onClose} onSaved={onSaved} />);
    expect(screen.getByDisplayValue('Dinner')).toBeInTheDocument();
    const spinbuttons = screen.getAllByRole('spinbutton');
    expect(spinbuttons[0].value).toBe('800');
    expect(spinbuttons[1].value).toBe('60');
  });

  it('shows a delete button for existing meal', () => {
    render(<MealModal logId={LOG_ID} existing={existing} onClose={onClose} onSaved={onSaved} />);
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('successful edit calls PUT on correct URL', async () => {
    api.put.mockResolvedValue({});

    render(<MealModal logId={LOG_ID} existing={existing} onClose={onClose} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        `/nutrition/${LOG_ID}/meals/${existing.id}`,
        { mealName: 'Dinner', calories: 800, proteinGrams: 60 }
      );
      expect(onSaved).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('delete button calls DELETE and then onSaved + onClose', async () => {
    api.delete.mockResolvedValue({});

    render(<MealModal logId={LOG_ID} existing={existing} onClose={onClose} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(`/nutrition/${LOG_ID}/meals/${existing.id}`);
      expect(onSaved).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('shows error on failed delete', async () => {
    api.delete.mockRejectedValue({ response: { data: { message: 'Not found' } } });

    render(<MealModal logId={LOG_ID} existing={existing} onClose={onClose} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => expect(screen.getByText(/not found/i)).toBeInTheDocument());
    expect(onSaved).not.toHaveBeenCalled();
  });
});
