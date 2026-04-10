import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DayInfoModal from '../components/DayInfoModal';

vi.mock('../api', () => ({ default: { post: vi.fn() } }));
vi.mock('../components/Modal.css', () => ({}));

import api from '../api';

const onClose = vi.fn();
const onSaved = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DayInfoModal — new entry', () => {
  it('renders "Day Info" title', () => {
    render(<DayInfoModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);
    expect(screen.getByText(/Day Info/)).toBeInTheDocument();
  });

  it('default day type is "training"', () => {
    render(<DayInfoModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);
    expect(screen.getByRole('combobox').value).toBe('training');
  });

  it('shows both training and rest options', () => {
    render(<DayInfoModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);
    expect(screen.getByRole('option', { name: 'training' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'rest' })).toBeInTheDocument();
  });

  it('steps field starts empty', () => {
    render(<DayInfoModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);
    expect(screen.getByPlaceholderText(/optional/i).value).toBe('');
  });

  it('Cancel button calls onClose', async () => {
    render(<DayInfoModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('successful submit POSTs correct payload, calls onSaved and onClose', async () => {
    api.post.mockResolvedValue({});

    render(<DayInfoModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'rest');
    await userEvent.type(screen.getByPlaceholderText(/optional/i), '8000');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/nutrition', {
        logDate: '2026-01-05',
        dayType: 'rest',
        steps: 8000,
      });
      expect(onSaved).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('sends steps as null when left empty', async () => {
    api.post.mockResolvedValue({});

    render(<DayInfoModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/nutrition', expect.objectContaining({
        steps: null,
      }));
    });
  });

  it('shows error on failed submit', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Already logged' } } });

    render(<DayInfoModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(screen.getByText(/already logged/i)).toBeInTheDocument());
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('shows fallback error when response has no message', async () => {
    api.post.mockRejectedValue({});

    render(<DayInfoModal prefillDate="2026-01-05" onClose={onClose} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(screen.getByText(/failed to save/i)).toBeInTheDocument());
  });
});

describe('DayInfoModal — editing existing entry', () => {
  const existing = { id: 7, logDate: '2026-01-04', dayType: 'rest', steps: 5000 };

  it('pre-fills day type from existing', () => {
    render(<DayInfoModal existing={existing} onClose={onClose} onSaved={onSaved} />);
    expect(screen.getByRole('combobox').value).toBe('rest');
  });

  it('pre-fills steps from existing', () => {
    render(<DayInfoModal existing={existing} onClose={onClose} onSaved={onSaved} />);
    expect(screen.getByPlaceholderText(/optional/i).value).toBe('5000');
  });

  it('uses existing logDate when submitting', async () => {
    api.post.mockResolvedValue({});

    render(<DayInfoModal existing={existing} onClose={onClose} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/nutrition', expect.objectContaining({
        logDate: '2026-01-04',
      }));
    });
  });
});
