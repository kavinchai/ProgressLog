import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeightModal from '../components/WeightModal';

vi.mock('../api', () => ({ default: { post: vi.fn() } }));
vi.mock('../components/Modal.css', () => ({}));

import api from '../api';

const onClose = vi.fn();
const onSaved = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

// WeightModal's labels have no htmlFor, so we query by role/display value.
// type="number" inputs have ARIA role "spinbutton".

describe('WeightModal — new entry', () => {
  it('renders "Log Weight" title', () => {
    render(<WeightModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);
    expect(screen.getByText(/Log Weight/)).toBeInTheDocument();
  });

  it('pre-fills the date from prefillDate', () => {
    render(<WeightModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);
    expect(screen.getByDisplayValue('2026-01-05')).toBeInTheDocument();
  });

  it('weight field starts empty', () => {
    render(<WeightModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);
    expect(screen.getByRole('spinbutton').value).toBe('');
  });

  it('Cancel button calls onClose', async () => {
    render(<WeightModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('successful submit POSTs to /weight with prefilled date, calls onSaved and onClose', async () => {
    api.post.mockResolvedValue({});

    render(<WeightModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);
    await userEvent.type(screen.getByRole('spinbutton'), '185.5');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/weight', {
        logDate: '2026-01-05',
        weightLbs: 185.5,
      });
      expect(onSaved).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('shows error message on failed submit', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Duplicate entry' } } });

    render(<WeightModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);
    await userEvent.type(screen.getByRole('spinbutton'), '180');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(screen.getByText(/duplicate entry/i)).toBeInTheDocument());
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('shows fallback error message when response has no message', async () => {
    api.post.mockRejectedValue({});

    render(<WeightModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);
    await userEvent.type(screen.getByRole('spinbutton'), '180');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(screen.getByText(/failed to save/i)).toBeInTheDocument());
  });

  it('Save button is disabled while saving', async () => {
    let resolve;
    api.post.mockReturnValue(new Promise(r => { resolve = r; }));

    render(<WeightModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);
    await userEvent.type(screen.getByRole('spinbutton'), '180');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    resolve({});
  });
});

describe('WeightModal — editing existing entry', () => {
  const existing = { id: 1, logDate: '2026-01-03', weightLbs: 175.2 };

  it('renders "Edit Weight" title', () => {
    render(<WeightModal existing={existing} onClose={onClose} onSaved={onSaved} />);
    expect(screen.getByText(/Edit Weight/)).toBeInTheDocument();
  });

  it('pre-fills date and weight from existing entry', () => {
    render(<WeightModal existing={existing} onClose={onClose} onSaved={onSaved} />);
    expect(screen.getByDisplayValue('2026-01-03')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton').value).toBe('175.2');
  });
});
