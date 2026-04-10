import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Templates from '../pages/Templates';

vi.mock('../pages/Templates.css', () => ({}));
vi.mock('../api', () => ({ default: { delete: vi.fn(), post: vi.fn() } }));
vi.mock('../hooks/useTemplates', () => ({ default: vi.fn() }));

// Stub out the heavy child modals — they have their own tests
vi.mock('../components/TemplateBuilderModal', () => ({
  default: ({ onClose }) => (
    <div data-testid="template-builder-modal">
      <button onClick={onClose}>Close Builder</button>
    </div>
  ),
}));
vi.mock('../components/WorkoutBuilderModal', () => ({
  default: ({ onClose }) => (
    <div data-testid="workout-builder-modal">
      <button onClick={onClose}>Close Workout Builder</button>
    </div>
  ),
}));
vi.mock('../components/Modal.css', () => ({}));
vi.mock('../components/WorkoutBuilderModal.css', () => ({}));
vi.mock('../utils/date', () => ({ localDateStr: () => '2026-01-10' }));

import api from '../api';
import useTemplates from '../hooks/useTemplates';

const TEMPLATES = [
  {
    id: 1,
    name: 'Push Day',
    exercises: [
      { exerciseName: 'Bench Press' },
      { exerciseName: 'OHP' },
    ],
  },
  {
    id: 2,
    name: 'Pull Day',
    exercises: [
      { exerciseName: 'Deadlift' },
    ],
  },
];

function setupTemplates(overrides = {}) {
  const refetch = vi.fn();
  useTemplates.mockReturnValue({ data: TEMPLATES, loading: false, refetch, ...overrides });
  return { refetch };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Templates page — rendering', () => {
  it('shows loading indicator while fetching', () => {
    useTemplates.mockReturnValue({ data: [], loading: true, refetch: vi.fn() });
    render(<Templates />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows empty state when there are no templates', () => {
    useTemplates.mockReturnValue({ data: [], loading: false, refetch: vi.fn() });
    render(<Templates />);
    expect(screen.getByText(/no templates yet/i)).toBeInTheDocument();
  });

  it('renders each template name', () => {
    setupTemplates();
    render(<Templates />);
    expect(screen.getByText('Push Day')).toBeInTheDocument();
    expect(screen.getByText('Pull Day')).toBeInTheDocument();
  });

  it('renders exercise list for each template', () => {
    setupTemplates();
    render(<Templates />);
    expect(screen.getByText(/bench press/i)).toBeInTheDocument();
    expect(screen.getByText(/deadlift/i)).toBeInTheDocument();
  });

  it('export button is disabled when there are no templates', () => {
    useTemplates.mockReturnValue({ data: [], loading: false, refetch: vi.fn() });
    render(<Templates />);
    expect(screen.getByRole('button', { name: /export/i })).toBeDisabled();
  });

  it('export button is enabled when templates exist', () => {
    setupTemplates();
    render(<Templates />);
    expect(screen.getByRole('button', { name: /export/i })).not.toBeDisabled();
  });
});

describe('Templates page — delete', () => {
  it('delete button calls DELETE API and then refetches', async () => {
    api.delete.mockResolvedValue({});
    const { refetch } = setupTemplates();
    render(<Templates />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await userEvent.click(deleteButtons[0]); // delete first template

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/templates/1');
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });

  it('delete button shows "[…]" while deleting', async () => {
    let resolveDelete;
    api.delete.mockReturnValue(new Promise(r => { resolveDelete = r; }));
    setupTemplates();
    render(<Templates />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await userEvent.click(deleteButtons[0]);

    expect(screen.getByText('[…]')).toBeInTheDocument();
    resolveDelete({});
  });
});

describe('Templates page — modals', () => {
  it('clicking [+ new] opens the TemplateBuilderModal', async () => {
    setupTemplates();
    render(<Templates />);

    await userEvent.click(screen.getByRole('button', { name: /\+ new/i }));
    expect(screen.getByTestId('template-builder-modal')).toBeInTheDocument();
  });

  it('closing TemplateBuilderModal hides it', async () => {
    setupTemplates();
    render(<Templates />);

    await userEvent.click(screen.getByRole('button', { name: /\+ new/i }));
    expect(screen.getByTestId('template-builder-modal')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /close builder/i }));
    expect(screen.queryByTestId('template-builder-modal')).not.toBeInTheDocument();
  });

  it('clicking [edit] opens TemplateBuilderModal', async () => {
    setupTemplates();
    render(<Templates />);

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await userEvent.click(editButtons[0]);
    expect(screen.getByTestId('template-builder-modal')).toBeInTheDocument();
  });

  it('clicking [use] opens WorkoutBuilderModal', async () => {
    setupTemplates();
    render(<Templates />);

    const useButtons = screen.getAllByRole('button', { name: /use/i });
    await userEvent.click(useButtons[0]);
    expect(screen.getByTestId('workout-builder-modal')).toBeInTheDocument();
  });

  it('closing WorkoutBuilderModal hides it', async () => {
    setupTemplates();
    render(<Templates />);

    const useButtons = screen.getAllByRole('button', { name: /use/i });
    await userEvent.click(useButtons[0]);
    expect(screen.getByTestId('workout-builder-modal')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /close workout builder/i }));
    expect(screen.queryByTestId('workout-builder-modal')).not.toBeInTheDocument();
  });
});

describe('Templates page — import', () => {
  it('shows error for non-array JSON input', async () => {
    setupTemplates();
    render(<Templates />);

    const file = new File(['{"not": "an array"}'], 'templates.json', { type: 'application/json' });
    const input = document.querySelector('input[type="file"]');
    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/file must contain a JSON array/i)).toBeInTheDocument();
    });
  });

  it('calls /templates/import and refetches on successful import', async () => {
    api.post.mockResolvedValue({});
    const { refetch } = setupTemplates();
    render(<Templates />);

    const fileContent = JSON.stringify([{ name: 'Leg Day', exercises: [] }]);
    const file = new File([fileContent], 'templates.json', { type: 'application/json' });
    const input = document.querySelector('input[type="file"]');
    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/templates/import', [{ name: 'Leg Day', exercises: [] }]);
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });

  it('shows API error on failed import', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Invalid template format' } } });
    setupTemplates();
    render(<Templates />);

    const fileContent = JSON.stringify([{ name: 'Bad', exercises: [] }]);
    const file = new File([fileContent], 'templates.json', { type: 'application/json' });
    const input = document.querySelector('input[type="file"]');
    await userEvent.upload(input, file);

    await waitFor(() => expect(screen.getByText(/invalid template format/i)).toBeInTheDocument());
  });
});
